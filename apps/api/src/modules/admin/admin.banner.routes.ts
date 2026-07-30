import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { bannerCreateSchema, bannerUpdateSchema } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { NotFoundError } from '../../lib/errors';
import { logAdmin } from '../../lib/adminLog';

export const adminBannerRouter = Router();
adminBannerRouter.use(requireAuth, requireRole('ADMIN'));

// GET /api/v1/admin/banners — semua banner (termasuk nonaktif).
adminBannerRouter.get('/', async (_req, res, next) => {
  try {
    const items = await prisma.banner.findMany({ orderBy: [{ placement: 'asc' }, { order: 'asc' }] });
    return ok(res, items);
  } catch (err) { next(err); }
});

// POST /api/v1/admin/banners
adminBannerRouter.post('/', validateBody(bannerCreateSchema), async (req, res, next) => {
  try {
    const { validFrom, validUntil, linkUrl, ...rest } = req.body;
    const banner = await prisma.banner.create({
      data: {
        ...rest,
        linkUrl: linkUrl || null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });
    logAdmin(req.user!.sub, 'CREATE_BANNER', {
      targetType: 'BANNER', targetId: banner.id, payload: req.body, note: banner.placement,
    });
    return created(res, banner, 'Banner ditambahkan');
  } catch (err) { next(err); }
});

// PATCH /api/v1/admin/banners/:id
adminBannerRouter.patch('/:id', validateBody(bannerUpdateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.banner.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Banner tidak ditemukan');
    const { validFrom, validUntil, linkUrl, ...rest } = req.body;
    const banner = await prisma.banner.update({
      where: { id: existing.id },
      data: {
        ...rest,
        ...(linkUrl !== undefined ? { linkUrl: linkUrl || null } : {}),
        ...(validFrom !== undefined ? { validFrom: validFrom ? new Date(validFrom) : null } : {}),
        ...(validUntil !== undefined ? { validUntil: validUntil ? new Date(validUntil) : null } : {}),
      },
    });
    logAdmin(req.user!.sub, 'UPDATE_BANNER', {
      targetType: 'BANNER', targetId: banner.id, payload: req.body, note: banner.placement,
    });
    return ok(res, banner, 'Banner diupdate');
  } catch (err) { next(err); }
});

// DELETE /api/v1/admin/banners/:id
adminBannerRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.banner.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Banner tidak ditemukan');
    await prisma.banner.delete({ where: { id: existing.id } });
    logAdmin(req.user!.sub, 'DELETE_BANNER', {
      targetType: 'BANNER', targetId: existing.id, note: existing.placement,
    });
    return ok(res, null, 'Banner dihapus');
  } catch (err) { next(err); }
});
