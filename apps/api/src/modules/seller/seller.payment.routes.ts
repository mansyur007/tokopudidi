// Verifikasi bukti transfer manual oleh seller.
import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { verifyPaymentSchema } from '@tokopudidi/shared';
import { ok } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { requireShopOwner } from './seller.middleware';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError } from '../../lib/errors';

export const sellerPaymentRouter = Router();
sellerPaymentRouter.use(requireAuth, requireShopOwner);

// GET /api/v1/seller/payments
sellerPaymentRouter.get('/', async (req, res, next) => {
  try {
    const status = String(req.query.status ?? 'PENDING'); // PENDING | VERIFIED | REJECTED
    const where = { order: { shopId: req.shop!.id } } as Record<string, unknown>;
    if (status === 'PENDING')  where.verifiedAt = null;
    if (status === 'PENDING')  where.rejectedAt = null;
    if (status === 'VERIFIED') where.verifiedAt = { not: null };
    if (status === 'REJECTED') where.rejectedAt = { not: null };

    const items = await prisma.paymentProof.findMany({
      where: where as Parameters<typeof prisma.paymentProof.findMany>[0]['where'],
      orderBy: { uploadedAt: 'desc' },
      include: {
        order: {
          select: {
            id: true, orderNumber: true, total: true, status: true,
            buyer: { select: { fullName: true, phone: true } },
          },
        },
      },
    });
    return ok(res, items);
  } catch (err) { next(err); }
});

// POST /api/v1/seller/payments/:proofId/verify
sellerPaymentRouter.post(
  '/:proofId/verify',
  validateBody(verifyPaymentSchema),
  async (req, res, next) => {
    try {
      const proof = await prisma.paymentProof.findFirst({
        where: { id: req.params.proofId, order: { shopId: req.shop!.id } },
        include: { order: true },
      });
      if (!proof) throw new NotFoundError('Bukti transfer tidak ditemukan');
      if (proof.verifiedAt || proof.rejectedAt) {
        throw new BadRequestError('Bukti sudah pernah diverifikasi');
      }

      if (req.body.approved) {
        await prisma.$transaction(async (tx) => {
          await tx.paymentProof.update({
            where: { id: proof.id },
            data: { verifiedAt: new Date(), verifiedById: req.user!.sub },
          });
          await tx.order.update({
            where: { id: proof.orderId },
            data: { status: 'PAID', paidAt: new Date() },
          });
          await tx.notification.create({
            data: {
              userId: proof.order.buyerId,
              type: 'ORDER_UPDATE',
              title: 'Pembayaran terverifikasi',
              body: `Pesanan ${proof.order.orderNumber} sudah diverifikasi penjual.`,
              linkUrl: `/pesanan/${proof.orderId}`,
            },
          });
        });
        return ok(res, null, 'Pembayaran disetujui');
      }

      await prisma.paymentProof.update({
        where: { id: proof.id },
        data: { rejectedAt: new Date(), rejectReason: req.body.rejectReason || 'Tidak sesuai' },
      });
      await prisma.notification.create({
        data: {
          userId: proof.order.buyerId,
          type: 'ORDER_UPDATE',
          title: 'Bukti transfer ditolak',
          body: req.body.rejectReason || 'Mohon upload bukti yang sesuai.',
          linkUrl: `/pesanan/${proof.orderId}/bayar`,
        },
      });
      return ok(res, null, 'Bukti ditolak');
    } catch (err) { next(err); }
  },
);
