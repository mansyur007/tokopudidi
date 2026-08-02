import { Router } from 'express';
import { ok } from '../../lib/response';
import { getRunningFlashSale } from './flashSale.read';

export const flashSaleRouter = Router();

/**
 * GET /api/v1/flash-sales/active
 *
 * `null` kalau tidak ada event berjalan — bukan 404. Beranda memanggil ini di
 * setiap render dan "tidak ada flash sale sekarang" adalah keadaan normal,
 * bukan kesalahan; membalas 404 hanya akan membuat setiap pemanggil menulis
 * penanganan error untuk keadaan yang paling sering terjadi.
 */
flashSaleRouter.get('/active', async (_req, res, next) => {
  try {
    return ok(res, await getRunningFlashSale());
  } catch (err) { next(err); }
});
