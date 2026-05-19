import { Router } from 'express';
import { z } from 'zod';
import { ok } from '../../lib/response';
import { validateBody } from '../../middleware/validate';
import { quoteShipping, isSameDayAvailable, isCodAvailable } from './shipping.service';
import { BadRequestError } from '../../lib/errors';

export const shippingRouter = Router();

const quoteSchema = z.object({
  province: z.string().min(1),
  weightGr: z.number().int().min(0),
  method: z.enum(['REGULAR', 'SAME_DAY', 'PICKUP_SENDIRI']),
});

shippingRouter.post('/quote', validateBody(quoteSchema), async (req, res, next) => {
  try {
    const { province, weightGr, method } = req.body;
    if (method === 'SAME_DAY' && !isSameDayAvailable(province)) {
      throw new BadRequestError('Pengiriman Same Day belum tersedia ke daerah kamu');
    }
    const cost = quoteShipping(province, method, weightGr);
    return ok(res, { cost, method, codAvailable: isCodAvailable(province) });
  } catch (err) { next(err); }
});

shippingRouter.get('/options', (req, res) => {
  const province = String(req.query.province ?? '');
  return ok(res, {
    sameDayAvailable: isSameDayAvailable(province),
    codAvailable: isCodAvailable(province),
  });
});
