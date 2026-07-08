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

// GET /api/v1/promo/available?subtotal=&shopId= — daftar voucher untuk Voucher Picker (M9-A4).
// Voucher toko (shopId terisi, M9-B2) hanya muncul kalau query shopId cocok.
promoRouter.get('/available', requireAuth, async (req, res, next) => {
  try {
    const subtotal = Math.max(0, Number(req.query.subtotal ?? 0) || 0);
    const shopId = typeof req.query.shopId === 'string' && req.query.shopId ? req.query.shopId : null;
    const now = new Date();

    const promos = await prisma.promoCode.findMany({
      where: {
        isActive: true,
        validUntil: { gte: now },
        OR: [{ shopId: null }, ...(shopId ? [{ shopId }] : [])],
      },
      orderBy: [{ shopId: { sort: 'desc', nulls: 'last' } }, { validUntil: 'asc' }],
      include: { shop: { select: { name: true } } },
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
        shopName: p.shop?.name ?? null, // terisi = voucher toko
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
  // shopId toko dalam checkout — wajib cocok untuk voucher toko (M9-B2).
  shopId: z.string().uuid().optional(),
});

// POST /api/v1/promo/validate
promoRouter.post('/validate', validateBody(validateSchema), async (req, res, next) => {
  try {
    const { code, subtotal, shopId } = req.body;
    const promo = await prisma.promoCode.findUnique({
      where: { code },
      include: { shop: { select: { name: true } } },
    });
    if (!promo || !promo.isActive) throw new BadRequestError('Kode promo tidak valid');
    if (promo.shopId && promo.shopId !== shopId) {
      throw new BadRequestError(`Voucher ini khusus belanja di toko ${promo.shop?.name ?? 'tertentu'}`);
    }

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
