import { Router } from 'express';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { BadRequestError } from '../../lib/errors';
import {
  getSuggestions,
  addSearchHistory,
  getSearchHistory,
  removeSearchHistory,
} from './search.service';

export const searchRouter = Router();

// GET /api/v1/search/suggest?q=...
searchRouter.get('/suggest', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '');
    const suggestions = await getSuggestions(q);
    return ok(res, suggestions);
  } catch (err) { next(err); }
});

searchRouter.get('/history', requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? '5'), 20);
    const items = await getSearchHistory(req.user!.sub, limit);
    return ok(res, items);
  } catch (err) { next(err); }
});

searchRouter.post('/history', requireAuth, async (req, res, next) => {
  try {
    const query = String(req.body?.query ?? '').trim();
    if (!query) throw new BadRequestError('Kata kunci tidak boleh kosong');
    await addSearchHistory(req.user!.sub, query);
    return created(res, null);
  } catch (err) { next(err); }
});

searchRouter.delete('/history/:id', requireAuth, async (req, res, next) => {
  try {
    await removeSearchHistory(req.user!.sub, req.params.id);
    return ok(res, null, 'Riwayat dihapus');
  } catch (err) { next(err); }
});
