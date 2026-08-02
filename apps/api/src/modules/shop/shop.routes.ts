import { Router } from 'express';
import { prisma, Prisma } from '@tokopudidi/database';
import { getShopBadge } from '@tokopudidi/shared';
import { ok } from '../../lib/response';
import { NotFoundError } from '../../lib/errors';
import { requireAuth } from '../../middleware/auth';
import { toProductCard, applyFlashPrices, CARD_SHOP_SELECT } from '../product/product.service';
import { followShop, unfollowShop } from '../follow/follow.service';

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
        // Bahan badge (M14-B1) — dibuang lagi di bawah, hanya hasilnya dikirim.
        ktpVerified: true, isOfficialStore: true,
      },
    });
    return ok(
      res,
      shops.map(({ ktpVerified, isOfficialStore, ...s }) => ({
        ...s,
        badge: getShopBadge({ ktpVerified, isOfficialStore, ...s }),
      })),
    );
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
        ratingAvg: true, ratingCount: true, totalSold: true,
        // Bahan badge (M14-B1). Tidak diteruskan mentah ke pembeli — sebelum
        // item ini, `ktpVerified` inilah yang salah dipakai header toko untuk
        // menampilkan ✅ seolah-olah tanda toko resmi.
        ktpVerified: true, isOfficialStore: true,
        // Follower (M13-A1) — dihitung langsung, tanpa kolom counter.
        // Sengaja TIDAK ada `isFollowing` di sini: halaman toko dirender di
        // server dan token buyer hidup di localStorage (zustand persist), jadi
        // request SSR tidak pernah membawa Authorization — nilainya akan selalu
        // `false` dan menyamar sebagai kebenaran. Status follow diambil client
        // -side dari `/users/me/following/ids` (pola wishlist M7-A1).
        _count: { select: { followers: true } },
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
    const { showcases, _count, ktpVerified, isOfficialStore, ...rest } = shop;
    return ok(res, {
      ...rest,
      badge: getShopBadge({ ktpVerified, isOfficialStore, ...rest }),
      followerCount: _count.followers,
      showcases: showcases
        .filter((s) => s._count.products > 0)
        .map((s) => ({ id: s.id, name: s.name, slug: s.slug, productCount: s._count.products })),
    });
  } catch (err) { next(err); }
});

// POST/DELETE /api/v1/shops/:slug/follow (M13-A1) — idempoten dua-duanya:
// follow dua kali tetap 1 baris, unfollow saat belum follow tetap 200.
shopRouter.post('/:slug/follow', requireAuth, async (req, res, next) => {
  try {
    await followShop(req.user!.sub, req.params.slug);
    return ok(res, null, 'Toko diikuti');
  } catch (err) { next(err); }
});

shopRouter.delete('/:slug/follow', requireAuth, async (req, res, next) => {
  try {
    await unfollowShop(req.user!.sub, req.params.slug);
    return ok(res, null, 'Berhenti mengikuti toko');
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
              shop: { select: CARD_SHOP_SELECT },
            },
          },
        },
      }),
    ]);

    // Lewat toProductCard yang sama dengan listing lain — harga sale (M9-B3)
    // dan flash sale (M15-C1) ikut.
    return ok(res, {
      showcase,
      items: await applyFlashPrices(rows.map((r) => toProductCard(r.product))),
      total,
      page,
      limit,
    });
  } catch (err) { next(err); }
});
