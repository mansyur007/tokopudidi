import { Router } from 'express';
import { prisma, Prisma } from '@tokopudidi/database';
import { ok } from '../../lib/response';
import { NotFoundError } from '../../lib/errors';
import { toProductCard } from '../product/product.service';

export const shopRouter = Router();

// Produk yang boleh tampil ke buyer — sengaja sama persis dengan filter di
// listProducts (product.service) supaya jumlah di tab etalase konsisten dengan
// grid "Semua Produk" di halaman toko yang sama.
const VISIBLE_PRODUCT: Prisma.ProductWhereInput = {
  isActive: true,
  deletedAt: null,
  stock: { gt: 0 },
};

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
        // Etalase (M11-B1) — count di-filter ke produk yang benar-benar tampil.
        showcases: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true, name: true, slug: true,
            _count: { select: { products: { where: { product: VISIBLE_PRODUCT } } } },
          },
        },
      },
    });
    if (!shop) throw new NotFoundError('Toko tidak ditemukan');

    // Etalase kosong disembunyikan dari buyer (tetap terlihat di panel seller).
    const { showcases, ...rest } = shop;
    return ok(res, {
      ...rest,
      showcases: showcases
        .filter((s) => s._count.products > 0)
        .map((s) => ({ id: s.id, name: s.name, slug: s.slug, productCount: s._count.products })),
    });
  } catch (err) { next(err); }
});

// GET /api/v1/shops/:slug/showcase/:showcaseSlug — produk satu etalase, paginated.
shopRouter.get('/:slug/showcase/:showcaseSlug', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 24));

    const shop = await prisma.shop.findUnique({
      where: { slug: req.params.slug },
      select: { id: true },
    });
    if (!shop) throw new NotFoundError('Toko tidak ditemukan');

    const showcase = await prisma.shopShowcase.findUnique({
      where: { shopId_slug: { shopId: shop.id, slug: req.params.showcaseSlug } },
      select: { id: true, name: true, slug: true },
    });
    if (!showcase) throw new NotFoundError('Etalase tidak ditemukan');

    const where: Prisma.ShopShowcaseProductWhereInput = {
      showcaseId: showcase.id,
      product: VISIBLE_PRODUCT,
    };

    const [total, rows] = await Promise.all([
      prisma.shopShowcaseProduct.count({ where }),
      prisma.shopShowcaseProduct.findMany({
        where,
        orderBy: { order: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          product: {
            include: {
              images: { orderBy: { order: 'asc' }, take: 1 },
              shop: { select: { id: true, name: true, slug: true, city: true } },
            },
          },
        },
      }),
    ]);

    // Lewat toProductCard yang sama dengan listing lain — harga sale (M9-B3) ikut.
    return ok(res, {
      showcase,
      items: rows.map((r) => toProductCard(r.product)),
      total,
      page,
      limit,
    });
  } catch (err) { next(err); }
});
