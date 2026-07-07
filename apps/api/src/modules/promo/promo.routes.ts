import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@tokopudidi/database';
import { ok } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { BadRequestError } from '../../lib/errors';

export const promoRouter = Router();

// Hitung diskon efektif sebuah promo terhadap subtotal.
function computeDiscount(
  promo: { discountType: 'FIXED' | 'PERCENTAGE'; discountValue: number; maxDiscount: number | null },
  subtotal: number,
): number {
  let discount =
    promo.discountType === 'PERCENTAGE'
      ? Math.floor((subtotal * promo.discountValue) / 100)
      : promo.discountValue;
  if (promo.maxDiscount && discount > promo.maxDiscount) discount = promo.maxDiscount;
  if (discount > subtotal) discount = subtotal;
  return discount;
}

// GET /api/v1/promo/available?subtotal= — daftar voucher untuk Voucher Picker (M9-A4).
// Param `shopId` disiapkan untuk voucher toko (M9-B2) — saat ini semua promo platform-wide.
promoRouter.get('/available', requireAuth, async (req, res, next) => {
  try {
    const subtotal = Math.max(0, Number(req.query.subtotal ?? 0) || 0);
    const now = new Date();

    const promos = await prisma.promoCode.findMany({
      where: { isActive: true, validUntil: { gte: now } },
      orderBy: { validUntil: 'asc' },
    });

    const eligible = [];
    const ineligible = [];
    for (const p of promos) {
      const base = {
        code: p.code,
        discountType: p.discountType,
        discountValue: p.discountValue,
        minPurchase: p.minPurchase,
        maxDiscount: p.maxDiscount,
        validUntil: p.validUntil,
      };
      let reason: string | null = null;
      if (now < p.validFrom) reason = 'Belum mulai berlaku';
      else if (p.usageLimit && p.usedCount >= p.usageLimit) reason = 'Kuota promo sudah habis';
      else if (subtotal < p.minPurchase) reason = `Min. belanja Rp ${p.minPurchase.toLocaleString('id-ID')}`;

      if (reason) ineligible.push({ promo: base, reason });
      else eligible.push({ ...base, discountAmount: computeDiscount(p, subtotal) });
    }

    return ok(res, { eligible, ineligible });
  } catch (err) { next(err); }
});

const validateSchema = z.object({
  code: z.string().trim().toUpperCase().min(1),
  subtotal: z.number().int().min(0),
});

// POST /api/v1/promo/validate
promoRouter.post('/validate', validateBody(validateSchema), async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;
    const promo = await prisma.promoCode.findUnique({ where: { code } });
    if (!promo || !promo.isActive) throw new BadRequestError('Kode promo tidak valid');

    const now = new Date();
    if (now < promo.validFrom || now > promo.validUntil) {
      throw new BadRequestError('Kode promo sudah tidak berlaku');
    }
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      throw new BadRequestError('Kuota promo sudah habis');
    }
    if (subtotal < promo.minPurchase) {
      throw new BadRequestError(
        `Minimal belanja Rp ${promo.minPurchase.toLocaleString('id-ID')} untuk pakai promo ini`,
      );
    }

    let discount =
      promo.discountType === 'PERCENTAGE'
        ? Math.floor((subtotal * promo.discountValue) / 100)
        : promo.discountValue;
    if (promo.maxDiscount && discount > promo.maxDiscount) discount = promo.maxDiscount;
    if (discount > subtotal) discount = subtotal;

    return ok(res, {
      code: promo.code,
      discountAmount: discount,
      type: promo.discountType,
      value: promo.discountValue,
    });
  } catch (err) { next(err); }
});
