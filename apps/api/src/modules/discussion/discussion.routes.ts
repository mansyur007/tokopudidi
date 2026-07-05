import { Router } from 'express';
import { replyDiscussionSchema } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { createReply, toggleHelpful, deleteDiscussion } from './discussion.service';

// Aksi terhadap satu diskusi: balas, tandai membantu, hapus.
export const discussionRouter = Router();

// POST /api/v1/discussions/:id/reply (login; isSellerReply auto kalau user = pemilik toko)
discussionRouter.post('/:id/reply', requireAuth, validateBody(replyDiscussionSchema), async (req, res, next) => {
  try {
    const reply = await createReply(req.params.id, req.user!.sub, req.body.message);
    return created(res, reply, 'Balasan terkirim');
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/discussions/:id/helpful (toggle)
discussionRouter.post('/:id/helpful', requireAuth, async (req, res, next) => {
  try {
    const result = await toggleHelpful(req.params.id, req.user!.sub);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/discussions/:id (pemilik / admin / penjual produk) — soft delete
discussionRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await deleteDiscussion(req.params.id, req.user!.sub, req.user!.role);
    return ok(res, null, 'Diskusi dihapus');
  } catch (err) {
    next(err);
  }
});
