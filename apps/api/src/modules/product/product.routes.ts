import { Router } from 'express';
import { productListQuerySchema, createDiscussionSchema, discussionSortValues, type DiscussionSort } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { NotFoundError } from '../../lib/errors';
import { requireAuth } from '../../middleware/auth';
import { optionalAuth } from '../../middleware/optionalAuth';
import { sessionCookie } from '../../middleware/sessionCookie';
import { validateBody } from '../../middleware/validate';
import { recordProductView } from '../recentlyViewed/recentlyViewed.service';
import { listDiscussions, createQuestion } from '../discussion/discussion.service';
import {
  listProducts,
  getProductBySlug,
  getRelatedProducts,
  getForYouProducts,
  incrementViewCount,
} from './product.service';

export const productRouter = Router();

// GET /api/v1/products — search + filter + sort + pagination.
productRouter.get('/', async (req, res, next) => {
  try {
    const query = productListQuerySchema.parse(req.query);
    const result = await listProducts(query);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/products/for-you?limit=30
productRouter.get('/for-you', optionalAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? '30'), 50);
    const items = await getForYouProducts(req.user?.sub, limit);
    return ok(res, items);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/products/:slug
productRouter.get('/:slug', async (req, res, next) => {
  try {
    const product = await getProductBySlug(req.params.slug);
    if (!product) throw new NotFoundError('Produk tidak ditemukan atau sudah dihapus');
    return ok(res, product);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/products/:id/related
productRouter.get('/:id/related', async (req, res, next) => {
  try {
    const items = await getRelatedProducts(req.params.id);
    return ok(res, items);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/products/:id/view — increment view count + catat "Baru Dilihat" (debounced di FE)
productRouter.post('/:id/view', optionalAuth, sessionCookie, async (req, res, next) => {
  try {
    await incrementViewCount(req.params.id);
    await recordProductView({ userId: req.user?.sub, sessionKey: req.sessionKey }, req.params.id);
    return ok(res, null);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/products/:id/discussions?sort=newest|helpful&page= — Diskusi (M8-A3)
productRouter.get('/:id/discussions', optionalAuth, async (req, res, next) => {
  try {
    const sortParam = String(req.query.sort ?? 'newest');
    const sort: DiscussionSort = (discussionSortValues as readonly string[]).includes(sortParam)
      ? (sortParam as DiscussionSort)
      : 'newest';
    const result = await listDiscussions(req.params.id, {
      sort,
      page: Math.max(1, Number(req.query.page ?? 1)),
      limit: Math.min(20, Number(req.query.limit ?? 10)),
      userId: req.user?.sub,
    });
    return ok(res, result);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/products/:id/discussions — ajukan pertanyaan (login)
productRouter.post('/:id/discussions', requireAuth, validateBody(createDiscussionSchema), async (req, res, next) => {
  try {
    const d = await createQuestion(req.params.id, req.user!.sub, req.body.message);
    return created(res, d, 'Pertanyaan terkirim');
  } catch (err) {
    next(err);
  }
});
