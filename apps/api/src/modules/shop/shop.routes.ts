import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { ok } from '../../lib/response';
import { NotFoundError } from '../../lib/errors';

export const shopRouter = Router();

// Daftar toko unggulan untuk homepage section "Toko UMKM Pilihan".
shopRouter.get('/featured', async (_req, res, next) => {
  try {
    const shops = await prisma.shop.findMany({
      where: { ktpVerified: true, isOpen: true },
      orderBy: [{ ratingAvg: 'desc' }, { totalSold: 'desc' }],
      take: 6,
      select: {
        id: true, slug: true, name: true, logoUrl: true, city: true,
        ratingAvg: true, ratingCount: true, totalSold: true,
      },
    });
    return ok(res, shops);
  } catch (err) { next(err); }
});

shopRouter.get('/:slug', async (req, res, next) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true, slug: true, name: true, description: true,
        logoUrl: true, bannerUrl: true, city: true, province: true,
        isOpen: true, closedReason: true, joinedAt: true,
        ratingAvg: true, ratingCount: true, totalSold: true, ktpVerified: true,
      },
    });
    if (!shop) throw new NotFoundError('Toko tidak ditemukan');
    return ok(res, shop);
  } catch (err) { next(err); }
});
