import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { voucherCreateSchema, voucherUpdateSchema } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError } from '../../lib/errors';

export const adminVoucherRouter = Router();
adminVoucherRouter.use(requireAuth, requireRole('ADMIN'));

// GET /api/v1/admin/voucher?scope=platform|shop|all — default platform.
adminVoucherRouter.get('/', async (req, res, next) => {
  try {
    const scope = String(req.query.scope ?? 'platform');
    const where =
      scope === 'shop' ? { shopId: { not: null } }
      : scope === 'all' ? {}
      : { shopId: null };
    const items = await prisma.promoCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { shop: { select: { name: true, slug: true } } },
    });
    return ok(res, items);
  } catch (err) { next(err); }
});

// POST /api/v1/admin/voucher — voucher platform (shopId null).
adminVoucherRouter.post('/', validateBody(voucherCreateSchema), async (req, res, next) => {
  try {
    const exists = await prisma.promoCode.findUnique({ where: { code: req.body.code } });
    if (exists) throw new BadRequestError('Kode voucher sudah dipakai, pilih kode lain');

    const item = await prisma.promoCode.create({
      data: {
        code: req.body.code,
        discountType: req.body.discountType,
        discountValue: req.body.discountValue,
        minPurchase: req.body.minPurchase ?? 0,
        maxDiscount: req.body.maxDiscount ?? null,
        usageLimit: req.body.usageLimit ?? null,
        validFrom: new Date(req.body.validFrom),
        validUntil: new Date(req.body.validUntil),
      },
    });
    return created(res, item, 'Voucher platform dibuat');
  } catch (err) { next(err); }
});

// PUT /api/v1/admin/voucher/:id — hanya voucher platform.
adminVoucherRouter.put('/:id', validateBody(voucherUpdateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.promoCode.findFirst({
      where: { id: req.params.id, shopId: null },
    });
    if (!existing) throw new NotFoundError('Voucher platform tidak ditemukan');

    const item = await prisma.promoCode.update({
      where: { id: existing.id },
      data: {
        ...(req.body.discountType !== undefined && { discountType: req.body.discountType }),
        ...(req.body.discountValue !== undefined && { discountValue: req.body.discountValue }),
        ...(req.body.minPurchase !== undefined && { minPurchase: req.body.minPurchase }),
        ...(req.body.maxDiscount !== undefined && { maxDiscount: req.body.maxDiscount }),
        ...(req.body.usageLimit !== undefined && { usageLimit: req.body.usageLimit }),
        ...(req.body.validFrom !== undefined && { validFrom: new Date(req.body.validFrom) }),
        ...(req.body.validUntil !== undefined && { validUntil: new Date(req.body.validUntil) }),
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
      },
    });
    return ok(res, item, 'Voucher diperbarui');
  } catch (err) { next(err); }
});

// DELETE /api/v1/admin/voucher/:id — hanya voucher platform.
adminVoucherRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.promoCode.findFirst({
      where: { id: req.params.id, shopId: null },
    });
    if (!existing) throw new NotFoundError('Voucher platform tidak ditemukan');
    await prisma.promoCode.delete({ where: { id: existing.id } });
    return ok(res, null, 'Voucher dihapus');
  } catch (err) { next(err); }
});
