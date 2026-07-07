import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { createReportSchema } from '@tokopudidi/shared';
import { ok } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError } from '../../lib/errors';

export const reportRouter = Router();

// Cek target laporan benar-benar ada.
async function assertTargetExists(targetType: string, targetId: string) {
  switch (targetType) {
    case 'PRODUCT': {
      const p = await prisma.product.findFirst({ where: { id: targetId, deletedAt: null } });
      if (!p) throw new NotFoundError('Produk tidak ditemukan');
      return;
    }
    case 'REVIEW': {
      const r = await prisma.review.findUnique({ where: { id: targetId } });
      if (!r) throw new NotFoundError('Ulasan tidak ditemukan');
      return;
    }
    case 'SHOP': {
      const s = await prisma.shop.findFirst({ where: { id: targetId, deletedAt: null } });
      if (!s) throw new NotFoundError('Toko tidak ditemukan');
      return;
    }
    case 'DISCUSSION': {
      const d = await prisma.discussion.findFirst({ where: { id: targetId, deletedAt: null } });
      if (!d) throw new NotFoundError('Diskusi tidak ditemukan');
      return;
    }
    case 'USER': {
      const u = await prisma.user.findFirst({ where: { id: targetId, deletedAt: null } });
      if (!u) throw new NotFoundError('Pengguna tidak ditemukan');
      return;
    }
    default:
      throw new BadRequestError('Tipe target tidak dikenal');
  }
}

// POST /api/v1/reports — buat laporan (login).
reportRouter.post('/', requireAuth, validateBody(createReportSchema), async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const { targetType, targetId, reason, description, evidenceUrls } = req.body;

    await assertTargetExists(targetType, targetId);

    // Satu user satu laporan OPEN per target — cegah spam.
    const existing = await prisma.report.findFirst({
      where: { reporterId: userId, targetType, targetId, status: { in: ['OPEN', 'REVIEWING'] } },
    });
    if (existing) throw new BadRequestError('Kamu sudah melaporkan ini — laporan sedang ditinjau admin');

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        targetType,
        targetId,
        reason,
        description: description || null,
        evidenceUrls: evidenceUrls ?? [],
      },
    });

    // Tandai flag isReported di ulasan (field existing).
    if (targetType === 'REVIEW') {
      await prisma.review.update({ where: { id: targetId }, data: { isReported: true } }).catch(() => undefined);
    }

    return ok(res, { id: report.id }, 'Laporan terkirim. Admin akan meninjau, terima kasih!');
  } catch (err) { next(err); }
});
