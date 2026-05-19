import { Router } from 'express';
import { productListQuerySchema } from '@tokopudidi/shared';
import { ok } from '../../lib/response';
import { NotFoundError } from '../../lib/errors';
import {
  listProducts,
  getProductBySlug,
  getRelatedProducts,
  searchSuggestions,
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

// GET /api/v1/products/suggest?q=...
productRouter.get('/suggest', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '');
    const suggestions = await searchSuggestions(q);
    return ok(res, { suggestions });
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

// POST /api/v1/products/:id/view — increment view count (debounced di FE)
productRouter.post('/:id/view', async (req, res, next) => {
  try {
    await incrementViewCount(req.params.id);
    return ok(res, null);
  } catch (err) {
    next(err);
  }
});
