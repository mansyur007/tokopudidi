import { Router } from 'express';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import {
  addToWishlist,
  removeFromWishlist,
  getWishlistCount,
  listWishlist,
  listWishlistProductIds,
} from './wishlist.service';

export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);

wishlistRouter.get('/', async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? '1');
    const limit = Math.min(Number(req.query.limit ?? '20'), 50);
    const data = await listWishlist(req.user!.sub, page, limit);
    return ok(res, data);
  } catch (err) { next(err); }
});

wishlistRouter.get('/count', async (req, res, next) => {
  try {
    const count = await getWishlistCount(req.user!.sub);
    return ok(res, { count });
  } catch (err) { next(err); }
});

wishlistRouter.get('/ids', async (req, res, next) => {
  try {
    const ids = await listWishlistProductIds(req.user!.sub);
    return ok(res, ids);
  } catch (err) { next(err); }
});

wishlistRouter.post('/:productId', async (req, res, next) => {
  try {
    await addToWishlist(req.user!.sub, req.params.productId);
    return created(res, null, 'Ditambahkan ke wishlist');
  } catch (err) { next(err); }
});

wishlistRouter.delete('/:productId', async (req, res, next) => {
  try {
    await removeFromWishlist(req.user!.sub, req.params.productId);
    return ok(res, null, 'Dihapus dari wishlist');
  } catch (err) { next(err); }
});
