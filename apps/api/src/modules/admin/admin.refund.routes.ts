import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { resolveRefundSchema } from '@tokopudidi/shared';
import { ok } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError } from '../../lib/errors';

export const adminRefundRouter = Router();
adminRefundRouter.use(requireAuth, requireRole('ADMIN'));

// GET /api/v1/admin/refunds?status=&page=
adminRefundRouter.get('/', async (req, res, next) => {
  try {
    const status = String(req.query.status ?? 'PENDING'); // PENDING | APPROVED | REJECTED | ALL
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Number(req.query.limit ?? 20));

    const where = status === 'ALL' ? {} : { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESOLVED' };

    const [total, items] = await Promise.all([
      prisma.refundRequest.count({ where }),
      prisma.refundRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          requestedBy: { select: { id: true, fullName: true, phone: true } },
          order: {
            select: {
              id: true, orderNumber: true, total: true, status: true, createdAt: true,
              shop: { select: { id: true, name: true } },
              items: { select: { productName: true, quantity: true, price: true } },
            },
          },
        },
      }),
    ]);
    return ok(res, { items, total, page, limit });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/refunds/:id/resolve
adminRefundRouter.post('/:id/resolve', validateBody(resolveRefundSchema), async (req, res, next) => {
  try {
    const refund = await prisma.refundRequest.findUnique({
      where: { id: req.params.id },
      include: { order: true },
    });
    if (!refund) throw new NotFoundError('Pengajuan refund tidak ditemukan');
    if (refund.status !== 'PENDING') throw new BadRequestError('Pengajuan ini sudah diproses');

    const { approved, adminNote } = req.body;

    if (!approved) {
      await prisma.$transaction(async (tx) => {
        await tx.refundRequest.update({
          where: { id: refund.id },
          data: { status: 'REJECTED', adminNote: adminNote || null, resolvedAt: new Date() },
        });
        await tx.notification.create({
          data: {
            userId: refund.requestedById,
            type: 'ORDER_UPDATE',
            title: 'Pengajuan refund ditolak',
            body: adminNote || `Pengajuan refund untuk ${refund.order.orderNumber} ditolak admin.`,
            linkUrl: `/pesanan/${refund.orderId}`,
          },
        });
      });
      return ok(res, null, 'Refund ditolak');
    }

    // Approve: kembalikan stok, balikkan saldo seller, set order REFUNDED.
    await prisma.$transaction(async (tx) => {
      const order = refund.order;
      const items = await tx.orderItem.findMany({ where: { orderId: order.id } });

      // Restore stok.
      for (const it of items) {
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

      // Balikkan saldo seller. Dana COMPLETED ada di balance; selain itu di pendingBalance.
      if (order.status === 'COMPLETED') {
        await tx.shop.update({
          where: { id: order.shopId },
          data: { balance: { decrement: order.total }, totalSold: { decrement: 1 } },
        });
        for (const it of items) {
          await tx.product.update({
            where: { id: it.productId },
            data: { soldCount: { decrement: it.quantity } },
          }).catch(() => undefined);
        }
      } else if (['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
        await tx.shop.update({
          where: { id: order.shopId },
          data: { pendingBalance: { decrement: order.total } },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'REFUNDED' },
      });
      await tx.refundRequest.update({
        where: { id: refund.id },
        data: { status: 'APPROVED', adminNote: adminNote || null, resolvedAt: new Date() },
      });
      await tx.notification.create({
        data: {
          userId: refund.requestedById,
          type: 'ORDER_UPDATE',
          title: 'Refund disetujui ✅',
          body: `Refund untuk ${order.orderNumber} disetujui. Dana akan dikembalikan ke metode pembayaranmu.`,
          linkUrl: `/pesanan/${order.id}`,
        },
      });
    });
    return ok(res, null, 'Refund disetujui');
  } catch (err) { next(err); }
});
