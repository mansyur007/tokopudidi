import { prisma, Prisma } from '@tokopudidi/database';
import {
  isComplaintWindowOpen,
  canEscalateComplaint,
  COMPLAINT_WINDOW_DAYS,
  COMPLAINT_TYPE_LABEL,
  type CreateComplaintInput,
  type SellerRespondComplaintInput,
  type DecideComplaintInput,
} from '@tokopudidi/shared';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors';
import { settleOrderRefund } from '../order/refund.settlement';

// Bentuk yang dipakai semua listing komplain — cukup untuk kartu di UI.
const complaintInclude = {
  orderItem: { select: { id: true, productName: true, productImage: true, quantity: true, price: true } },
  order: {
    select: {
      id: true, orderNumber: true, status: true, total: true, deliveredAt: true,
      shop: { select: { id: true, name: true, slug: true, ownerId: true } },
    },
  },
  buyer: { select: { id: true, fullName: true, phone: true } },
} satisfies Prisma.ComplaintInclude;

async function getComplaintOrThrow(id: string) {
  const complaint = await prisma.complaint.findUnique({ where: { id }, include: complaintInclude });
  if (!complaint) throw new NotFoundError('Komplain tidak ditemukan');
  return complaint;
}

/** Buyer mengajukan komplain atas satu item pesanan yang sudah diterima. */
export async function createComplaint(
  userId: string,
  orderId: string,
  input: CreateComplaintInput,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId: userId },
    include: { items: { select: { id: true, productName: true } }, shop: { select: { ownerId: true } } },
  });
  if (!order) throw new NotFoundError('Pesanan tidak ditemukan');

  // Barang harus sudah sampai — komplain soal kondisi barang tidak masuk akal sebelum itu.
  if (!['DELIVERED', 'COMPLETED'].includes(order.status)) {
    throw new BadRequestError('Komplain hanya bisa diajukan setelah barang sampai');
  }
  if (!isComplaintWindowOpen(order.deliveredAt)) {
    throw new BadRequestError(
      `Batas waktu komplain ${COMPLAINT_WINDOW_DAYS} hari sejak barang diterima sudah lewat`,
    );
  }

  const item = order.items.find((it) => it.id === input.orderItemId);
  if (!item) throw new BadRequestError('Barang tidak ada di pesanan ini');

  const existing = await prisma.complaint.findUnique({ where: { orderItemId: input.orderItemId } });
  if (existing) throw new BadRequestError('Barang ini sudah pernah dikomplain');

  const complaint = await prisma.complaint.create({
    data: {
      orderId: order.id,
      orderItemId: input.orderItemId,
      buyerId: userId,
      type: input.type,
      description: input.description,
      evidenceUrls: input.evidenceUrls ?? [],
      resolutionType: input.resolutionType,
    },
    include: complaintInclude,
  });

  await prisma.notification.create({
    data: {
      userId: order.shop.ownerId,
      type: 'ORDER_UPDATE',
      title: 'Ada komplain pesanan',
      body: `Pembeli komplain "${COMPLAINT_TYPE_LABEL[input.type]}" untuk ${item.productName} (${order.orderNumber}). Mohon ditanggapi.`,
      linkUrl: `/seller/komplain`,
    },
  });

  return complaint;
}

/**
 * Seller menanggapi. Terima = komplain langsung selesai (refund diproses saat itu
 * juga kalau buyer minta uang kembali); tolak = bola pindah ke buyer untuk escalate.
 */
export async function sellerRespond(
  userId: string,
  complaintId: string,
  input: SellerRespondComplaintInput,
) {
  const complaint = await getComplaintOrThrow(complaintId);
  if (complaint.order.shop.ownerId !== userId) {
    throw new ForbiddenError('Komplain ini bukan untuk tokomu');
  }
  if (complaint.status !== 'OPEN') {
    throw new BadRequestError('Komplain ini sudah kamu tanggapi');
  }

  const now = new Date();

  if (!input.accept) {
    await prisma.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id: complaint.id },
        data: { status: 'SELLER_RESPONDED', sellerResponse: input.message, respondedAt: now },
      });
      await tx.notification.create({
        data: {
          userId: complaint.buyerId,
          type: 'ORDER_UPDATE',
          title: 'Penjual menolak komplain',
          body: `${input.message} — kamu bisa menaikkan kasus ini ke admin.`,
          linkUrl: `/komplain`,
        },
      });
    });
    return getComplaintOrThrow(complaint.id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.complaint.update({
      where: { id: complaint.id },
      data: {
        status: 'RESOLVED',
        sellerResponse: input.message,
        respondedAt: now,
        resolvedAt: now,
      },
    });
    if (complaint.resolutionType === 'REFUND') {
      await settleOrderRefund(tx, {
        id: complaint.order.id,
        shopId: complaint.order.shop.id,
        status: complaint.order.status,
        total: complaint.order.total,
      });
    }
    await tx.notification.create({
      data: {
        userId: complaint.buyerId,
        type: 'ORDER_UPDATE',
        title: complaint.resolutionType === 'REFUND' ? 'Komplain diterima — dana dikembalikan' : 'Komplain diterima — barang diganti',
        body: input.message,
        linkUrl: `/komplain`,
      },
    });
  });

  return getComplaintOrThrow(complaint.id);
}

/** Buyer menaikkan kasus ke admin setelah seller menolak (atau seller diam). */
export async function escalateComplaint(userId: string, complaintId: string) {
  const complaint = await getComplaintOrThrow(complaintId);
  if (complaint.buyerId !== userId) throw new ForbiddenError('Komplain ini bukan milikmu');
  if (!canEscalateComplaint(complaint)) {
    throw new BadRequestError(
      complaint.status === 'OPEN'
        ? 'Beri penjual waktu menanggapi dulu ya'
        : 'Komplain ini tidak bisa dinaikkan ke admin',
    );
  }

  return prisma.complaint.update({
    where: { id: complaint.id },
    data: { status: 'ESCALATED', escalatedAt: new Date() },
    include: complaintInclude,
  });
}

/** Keputusan admin — final, tidak bisa di-escalate lagi. */
export async function decideComplaint(complaintId: string, input: DecideComplaintInput) {
  const complaint = await getComplaintOrThrow(complaintId);
  if (complaint.status !== 'ESCALATED') {
    throw new BadRequestError('Hanya komplain yang dinaikkan ke admin yang bisa diputuskan');
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.complaint.update({
      where: { id: complaint.id },
      data: {
        status: input.outcome,
        adminDecision: input.note || null,
        resolvedAt: now,
      },
    });

    // Admin memenangkan buyer & yang diminta uang kembali → beresi saldo & stok.
    if (input.outcome === 'RESOLVED' && complaint.resolutionType === 'REFUND') {
      await settleOrderRefund(tx, {
        id: complaint.order.id,
        shopId: complaint.order.shop.id,
        status: complaint.order.status,
        total: complaint.order.total,
      });
    }

    const menang = input.outcome === 'RESOLVED';
    for (const userId of [complaint.buyerId, complaint.order.shop.ownerId]) {
      await tx.notification.create({
        data: {
          userId,
          type: 'ORDER_UPDATE',
          title: menang ? 'Komplain dimenangkan pembeli' : 'Komplain ditolak admin',
          body: input.note || `Admin sudah memutuskan komplain untuk pesanan ${complaint.order.orderNumber}.`,
          linkUrl: userId === complaint.buyerId ? '/komplain' : '/seller/komplain',
        },
      });
    }
  });

  return getComplaintOrThrow(complaint.id);
}

interface ListFilter {
  status?: string;
  page: number;
  limit: number;
}

function buildWhere(base: Prisma.ComplaintWhereInput, filter: ListFilter): Prisma.ComplaintWhereInput {
  if (!filter.status || filter.status === 'ALL') return base;
  return { ...base, status: filter.status as Prisma.EnumComplaintStatusFilter['equals'] };
}

async function listComplaints(base: Prisma.ComplaintWhereInput, filter: ListFilter) {
  const where = buildWhere(base, filter);
  const [total, items] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      include: complaintInclude,
    }),
  ]);
  return { items, total, page: filter.page, limit: filter.limit };
}

export const listComplaintsForBuyer = (userId: string, filter: ListFilter) =>
  listComplaints({ buyerId: userId }, filter);

export const listComplaintsForShop = (shopId: string, filter: ListFilter) =>
  listComplaints({ order: { shopId } }, filter);

export const listComplaintsForAdmin = (filter: ListFilter) =>
  listComplaints({}, filter);
