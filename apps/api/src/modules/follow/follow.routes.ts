import { Router } from 'express';
import { ok } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { listFollowedShopIds, listFollowedShops } from './follow.service';

// Dipasang di /api/v1/users/me/following — mengikuti pola wishlist & alamat.
// Aksi follow/unfollow-nya sendiri ada di shopRouter (`/shops/:slug/follow`)
// karena kuncinya slug toko, bukan id.
export const followingRouter = Router();
followingRouter.use(requireAuth);

followingRouter.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? '1') || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? '20') || 20));
    const data = await listFollowedShops(req.user!.sub, page, limit);
    return ok(res, data);
  } catch (err) { next(err); }
});

followingRouter.get('/ids', async (req, res, next) => {
  try {
    const ids = await listFollowedShopIds(req.user!.sub);
    return ok(res, ids);
  } catch (err) { next(err); }
});
