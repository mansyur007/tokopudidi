import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { ok } from '../../lib/response';

export const sitemapRouter = Router();

// Batas aman: sitemap.xml tunggal dibatasi 50.000 URL / 50 MB oleh spesifikasi.
// 5.000 produk terbaru masih jauh di bawah itu dan menjaga responsnya ringan.
// Kalau katalog tumbuh melewati ini, pecah jadi sitemap index (belum perlu).
const MAX_PRODUCTS = 5_000;

/**
 * GET /api/v1/sitemap — data mentah untuk `apps/web/src/app/sitemap.ts` (M12-D3).
 *
 * Satu panggilan mengembalikan seluruh slug yang perlu diindeks. Ini jauh lebih
 * hemat daripada FE menyusuri endpoint listing yang paginated (yang juga
 * memaksa `toProductCard` dan join gambar untuk data yang tidak dipakai).
 */
sitemapRouter.get('/', async (_req, res, next) => {
  try {
    const [products, shops, categories] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: MAX_PRODUCTS,
        select: { slug: true, updatedAt: true },
      }),
      prisma.shop.findMany({
        where: { deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    return ok(res, { products, shops, categories });
  } catch (err) { next(err); }
});
