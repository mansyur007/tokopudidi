import { Router } from 'express';
import { prisma, Prisma } from '@tokopudidi/database';
import { shipOrderSchema, rejectOrderSchema } from '@tokopudidi/shared';
import { ok } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { requireShopOwner } from './seller.middleware';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, ForbiddenError } from '../../lib/errors';

export const sellerOrderRouter = Router();
sellerOrderRouter.use(requireAuth, requireShopOwner);

// GET /api/v1/seller/orders
sellerOrderRouter.get('/', async (req, res, next) => {
  try {
    const shopId = req.shop!.id;
    const status = String(req.query.status ?? 'ALL');
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Number(req.query.limit ?? 20));

    const where: Prisma.OrderWhereInput = { shopId };
    if (status !== 'ALL') where.status = status as Prisma.EnumOrderStatusFilter['equals'];

    const [total, items] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          buyer: { select: { id: true, fullName: true, phone: true } },
          items: { take: 3 },
        },
      }),
    ]);
    return ok(res, { items, total, page, limit });
  } catch (err) { next(err); }
});

// GET /api/v1/seller/orders/:id
sellerOrderRouter.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
      include: {
        buyer: { select: { id: true, fullName: true, phone: true } },
        items: true,
        paymentProof: true,
      },
    });
    if (!order) throw new NotFoundError('Pesanan tidak ditemukan');
    return ok(res, order);
  } catch (err) { next(err); }
});

// POST /api/v1/seller/orders/:id/process — PAID → PROCESSING
sellerOrderRouter.post('/:id/process', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
    });
    if (!order) throw new NotFoundError('Pesanan tidak ditemukan');
    if (order.status !== 'PAID') {
      throw new ForbiddenError('Pesanan belum dibayar atau sudah diproses');
    }
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PROCESSING' },
    });
    await prisma.notification.create({
      data: {
        userId: order.buyerId,
        type: 'ORDER_UPDATE',
        title: 'Pesananmu lagi dipersiapkan',
        body: `Pesanan ${order.orderNumber} sedang dipersiapkan oleh penjual.`,
        linkUrl: `/pesanan/${order.id}`,
      },
    });
    return ok(res, updated, 'Pesanan diproses');
  } catch (err) { next(err); }
});

// POST /api/v1/seller/orders/:id/ship — PROCESSING → SHIPPED
sellerOrderRouter.post('/:id/ship', validateBody(shipOrderSchema), async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
    });
    if (!order) throw new NotFoundError('Pesanan tidak ditemukan');
    if (!['PAID', 'PROCESSING'].includes(order.status)) {
      throw new ForbiddenError('Pesanan tidak bisa dikirim di status ini');
    }
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'SHIPPED',
        trackingNumber: req.body.trackingNumber,
        shippedAt: new Date(),
      },
    });
    // Pindahkan total ke pendingBalance toko.
    await prisma.shop.update({
      where: { id: order.shopId },
      data: { pendingBalance: { increment: order.total } },
    });
    await prisma.notification.create({
      data: {
        userId: order.buyerId,
        type: 'ORDER_UPDATE',
        title: 'Pesananmu sudah dikirim!',
        body: `No resi: ${req.body.trackingNumber}. Lacak di halaman pesanan.`,
        linkUrl: `/pesanan/${order.id}`,
      },
    });
    return ok(res, updated, 'Pesanan ditandai dikirim');
  } catch (err) { next(err); }
});

// POST /api/v1/seller/orders/:id/reject — tolak (cancel + restore stok)
sellerOrderRouter.post('/:id/reject', validateBody(rejectOrderSchema), async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
      include: { items: true },
    });
    if (!order) throw new NotFoundError('Pesanan tidak ditemukan');
    if (!['PAID', 'PROCESSING', 'PENDING_PAYMENT'].includes(order.status)) {
      throw new ForbiddenError('Pesanan tidak bisa ditolak di status ini');
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: `Ditolak penjual: ${req.body.reason}`,
        },
      });
      for (const it of order.items) {
        if (it.variantId) {
          await tx.productVariant.update({
            where: { id: it.variantId },
            data: { stock: { increment: it.quantity } },
          }).catch(() => undefined);
        } else {
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { increment: it.quantity } },
          }).catch(() => undefined);
        }
      }
    });

    await prisma.notification.create({
      data: {
        userId: order.buyerId,
        type: 'ORDER_UPDATE',
        title: 'Pesananmu ditolak penjual',
        body: req.body.reason,
        linkUrl: `/pesanan/${order.id}`,
      },
    });
    return ok(res, null, 'Pesanan ditolak');
  } catch (err) { next(err); }
});

// POST /api/v1/seller/orders/:id/mark-delivered — sementara seller bisa tandai sampai (mock kurir)
sellerOrderRouter.post('/:id/mark-delivered', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
    });
    if (!order) throw new NotFoundError('Pesanan tidak ditemukan');
    if (order.status !== 'SHIPPED') throw new ForbiddenError('Pesanan belum dikirim');
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
    await prisma.notification.create({
      data: {
        userId: order.buyerId,
        type: 'ORDER_UPDATE',
        title: 'Pesananmu sudah sampai!',
        body: 'Cek dulu paketmu, kalau sudah sesuai langsung selesaikan ya.',
        linkUrl: `/pesanan/${order.id}`,
      },
    });
    return ok(res, updated);
  } catch (err) { next(err); }
});
