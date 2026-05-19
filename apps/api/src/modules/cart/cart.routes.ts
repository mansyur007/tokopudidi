import { Router } from 'express';
import { addToCartSchema, updateCartItemSchema } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { getCartForUser, addItem, updateItemQty, removeItem } from './cart.service';

export const cartRouter = Router();
cartRouter.use(requireAuth);

cartRouter.get('/', async (req, res, next) => {
  try {
    const data = await getCartForUser(req.user!.sub);
    return ok(res, data);
  } catch (err) { next(err); }
});

cartRouter.post('/items', validateBody(addToCartSchema), async (req, res, next) => {
  try {
    const item = await addItem(req.user!.sub, req.body);
    return created(res, item, 'Sudah masuk keranjang!');
  } catch (err) { next(err); }
});

cartRouter.patch('/items/:id', validateBody(updateCartItemSchema), async (req, res, next) => {
  try {
    const item = await updateItemQty(req.user!.sub, req.params.id, req.body.quantity);
    return ok(res, item);
  } catch (err) { next(err); }
});

cartRouter.delete('/items/:id', async (req, res, next) => {
  try {
    await removeItem(req.user!.sub, req.params.id);
    return ok(res, null, 'Item dihapus dari keranjang');
  } catch (err) { next(err); }
});
