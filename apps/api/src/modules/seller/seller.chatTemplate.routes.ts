import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { chatTemplateSchema, chatTemplateUpdateSchema } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { requireShopOwner } from './seller.middleware';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError } from '../../lib/errors';

const MAX_TEMPLATES = 20;

export const sellerChatTemplateRouter = Router();
sellerChatTemplateRouter.use(requireAuth, requireShopOwner);

// GET /api/v1/seller/chat-templates
sellerChatTemplateRouter.get('/', async (req, res, next) => {
  try {
    const items = await prisma.chatTemplate.findMany({
      where: { shopId: req.shop!.id },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    return ok(res, items);
  } catch (err) { next(err); }
});

// POST /api/v1/seller/chat-templates
sellerChatTemplateRouter.post('/', validateBody(chatTemplateSchema), async (req, res, next) => {
  try {
    const shopId = req.shop!.id;
    const count = await prisma.chatTemplate.count({ where: { shopId } });
    if (count >= MAX_TEMPLATES) {
      throw new BadRequestError(`Maksimal ${MAX_TEMPLATES} template per toko`);
    }
    const item = await prisma.chatTemplate.create({
      data: {
        shopId,
        label: req.body.label,
        body: req.body.body,
        // Default: taruh di urutan paling bawah.
        order: req.body.order || count,
      },
    });
    return created(res, item, 'Template tersimpan');
  } catch (err) { next(err); }
});

// PUT /api/v1/seller/chat-templates/:id
sellerChatTemplateRouter.put('/:id', validateBody(chatTemplateUpdateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.chatTemplate.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
    });
    if (!existing) throw new NotFoundError('Template tidak ditemukan');
    const item = await prisma.chatTemplate.update({
      where: { id: existing.id },
      data: {
        ...(req.body.label !== undefined && { label: req.body.label }),
        ...(req.body.body !== undefined && { body: req.body.body }),
        ...(req.body.order !== undefined && { order: req.body.order }),
      },
    });
    return ok(res, item, 'Template diperbarui');
  } catch (err) { next(err); }
});

// DELETE /api/v1/seller/chat-templates/:id
sellerChatTemplateRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.chatTemplate.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
    });
    if (!existing) throw new NotFoundError('Template tidak ditemukan');
    await prisma.chatTemplate.delete({ where: { id: existing.id } });
    return ok(res, null, 'Template dihapus');
  } catch (err) { next(err); }
});
