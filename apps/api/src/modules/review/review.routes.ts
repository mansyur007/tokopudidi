import { Router } from 'express';
import { createReviewSchema, sellerReplySchema } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import {
  createReview,
  listProductReviews,
  listShopReviews,
  sellerReply,
  getReviewableItems,
} from './review.service';

export const reviewRouter = Router();

// Publik: list review per produk.
reviewRouter.get('/products/:productId', async (req, res, next) => {
  try {
    const result = await listProductReviews(req.params.productId, {
      ratingFilter: req.query.rating ? Number(req.query.rating) : undefined,
      withImageOnly: req.query.withImage === 'true',
      page: Math.max(1, Number(req.query.page ?? 1)),
      limit: Math.min(50, Number(req.query.limit ?? 10)),
    });
    return ok(res, result);
  } catch (err) { next(err); }
});

// Publik: list review per toko.
reviewRouter.get('/shops/:shopId', async (req, res, next) => {
  try {
    const result = await listShopReviews(
      req.params.shopId,
      Math.max(1, Number(req.query.page ?? 1)),
      Math.min(50, Number(req.query.limit ?? 20)),
      req.query.rating ? Number(req.query.rating) : undefined,
    );
    return ok(res, result);
  } catch (err) { next(err); }
});

// Buyer: bikin review.
reviewRouter.post('/', requireAuth, validateBody(createReviewSchema), async (req, res, next) => {
  try {
    const review = await createReview(req.user!.sub, req.body);
    return created(res, review, 'Ulasan terkirim, makasih!');
  } catch (err) { next(err); }
});

// Buyer: item-item yang masih bisa di-review.
reviewRouter.get('/me/pending', requireAuth, async (req, res, next) => {
  try {
    const items = await getReviewableItems(req.user!.sub);
    return ok(res, items);
  } catch (err) { next(err); }
});

// Seller: balas review.
reviewRouter.post('/:id/reply', requireAuth, validateBody(sellerReplySchema), async (req, res, next) => {
  try {
    const review = await sellerReply(req.user!.sub, req.params.id, req.body.reply);
    return ok(res, review, 'Balasan terkirim');
  } catch (err) { next(err); }
});
