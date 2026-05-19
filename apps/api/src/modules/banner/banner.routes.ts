import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { ok } from '../../lib/response';

export const bannerRouter = Router();

// GET /api/v1/banners?placement=HOME_TOP
bannerRouter.get('/', async (req, res, next) => {
  try {
    const placement = String(req.query.placement ?? 'HOME_TOP');
    const now = new Date();
    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
        placement: placement as 'HOME_TOP' | 'HOME_MIDDLE' | 'CATEGORY_PAGE',
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        ],
      },
      orderBy: { order: 'asc' },
      take: 5,
    });
    return ok(res, banners);
  } catch (err) { next(err); }
});
