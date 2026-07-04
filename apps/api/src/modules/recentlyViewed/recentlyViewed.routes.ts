import { Router } from 'express';
import { ok } from '../../lib/response';
import { optionalAuth } from '../../middleware/optionalAuth';
import { sessionCookie } from '../../middleware/sessionCookie';
import { getRecentProducts, removeRecentProduct } from './recentlyViewed.service';

export const recentlyViewedRouter = Router();
recentlyViewedRouter.use(optionalAuth, sessionCookie);

// GET /api/v1/users/me/recent-products?limit=10
recentlyViewedRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? '10'), 30);
    const items = await getRecentProducts(
      { userId: req.user?.sub, sessionKey: req.sessionKey },
      limit,
    );
    return ok(res, items);
  } catch (err) { next(err); }
});

recentlyViewedRouter.delete('/:productId', async (req, res, next) => {
  try {
    await removeRecentProduct(
      { userId: req.user?.sub, sessionKey: req.sessionKey },
      req.params.productId,
    );
    return ok(res, null, 'Dihapus dari riwayat');
  } catch (err) { next(err); }
});
