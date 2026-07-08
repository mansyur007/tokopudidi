import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { voucherCreateSchema, voucherUpdateSchema } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { requireShopOwner } from './seller.middleware';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError } from '../../lib/errors';

export const sellerVoucherRouter = Router();
sellerVoucherRouter.use(requireAuth, requireShopOwner);

// GET /api/v1/seller/voucher
sellerVoucherRouter.get('/', async (req, res, next) => {
  try {
    const items = await prisma.promoCode.findMany({
      where: { shopId: req.shop!.id },
      orderBy: { createdAt: 'desc' },
    });
    return ok(res, items);
  } catch (err) { next(err); }
});

// POST /api/v1/seller/voucher
sellerVoucherRouter.post('/', validateBody(voucherCreateSchema), async (req, res, next) => {
  try {
    const exists = await prisma.promoCode.findUnique({ where: { code: req.body.code } });
    if (exists) throw new BadRequestError('Kode voucher sudah dipakai, pilih kode lain');

    const item = await prisma.promoCode.create({
      data: {
        shopId: req.shop!.id,
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
    return created(res, item, 'Voucher toko dibuat');
  } catch (err) { next(err); }
});

// PUT /api/v1/seller/voucher/:id — update / pause / resume
sellerVoucherRouter.put('/:id', validateBody(voucherUpdateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.promoCode.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
    });
    if (!existing) throw new NotFoundError('Voucher tidak ditemukan');

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

// DELETE /api/v1/seller/voucher/:id
sellerVoucherRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.promoCode.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
    });
    if (!existing) throw new NotFoundError('Voucher tidak ditemukan');
    await prisma.promoCode.delete({ where: { id: existing.id } });
    return ok(res, null, 'Voucher dihapus');
  } catch (err) { next(err); }
});
