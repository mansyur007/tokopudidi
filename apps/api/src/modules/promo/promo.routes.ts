import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@tokopudidi/database';
import { ok } from '../../lib/response';
import { validateBody } from '../../middleware/validate';
import { BadRequestError } from '../../lib/errors';

export const promoRouter = Router();

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
