import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import {
  showcaseCreateSchema,
  showcaseUpdateSchema,
  showcaseAssignProductsSchema,
  showcaseMoveSchema,
  slugify,
  MAX_SHOWCASES_PER_SHOP,
  MAX_PRODUCTS_PER_SHOWCASE,
} from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { requireShopOwner } from './seller.middleware';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../lib/errors';
import { swapAndNormalize } from './showcase.order';

export const sellerShowcaseRouter = Router();
sellerShowcaseRouter.use(requireAuth, requireShopOwner);

// Slug unik per toko (bukan global) — dua toko boleh sama-sama punya "best-seller".
async function uniqueShowcaseSlug(shopId: string, name: string): Promise<string> {
  const base = slugify(name) || 'etalase';
  let slug = base;
  for (let i = 1; i < 50; i++) {
    const taken = await prisma.shopShowcase.findUnique({
      where: { shopId_slug: { shopId, slug } },
    });
    if (!taken) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

// GET /api/v1/seller/showcase — semua etalase toko, termasuk yang kosong.
sellerShowcaseRouter.get('/', async (req, res, next) => {
  try {
    const items = await prisma.shopShowcase.findMany({
      where: { shopId: req.shop!.id },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    return ok(res, items);
  } catch (err) { next(err); }
});

// GET /api/v1/seller/showcase/:id — detail + produk terpilih (untuk picker).
sellerShowcaseRouter.get('/:id', async (req, res, next) => {
  try {
    const showcase = await prisma.shopShowcase.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
      include: {
        products: {
          orderBy: { order: 'asc' },
          include: {
            product: {
              select: {
                id: true, name: true, slug: true, price: true, stock: true, isActive: true,
                images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
              },
            },
          },
        },
      },
    });
    if (!showcase) throw new NotFoundError('Etalase tidak ditemukan');
    return ok(res, showcase);
  } catch (err) { next(err); }
});

// POST /api/v1/seller/showcase
sellerShowcaseRouter.post('/', validateBody(showcaseCreateSchema), async (req, res, next) => {
  try {
    const shopId = req.shop!.id;
    const count = await prisma.shopShowcase.count({ where: { shopId } });
    if (count >= MAX_SHOWCASES_PER_SHOP) {
      throw new BadRequestError(`Maksimal ${MAX_SHOWCASES_PER_SHOP} etalase per toko`);
    }
    const item = await prisma.shopShowcase.create({
      data: {
        shopId,
        name: req.body.name,
        slug: await uniqueShowcaseSlug(shopId, req.body.name),
        // Etalase baru masuk ke urutan paling bawah.
        order: count,
      },
    });
    return created(res, item, 'Etalase dibuat');
  } catch (err) { next(err); }
});

// PUT /api/v1/seller/showcase/:id — rename saja; slug sengaja tidak ikut berubah
// supaya URL etalase yang sudah dibagikan tidak mati.
sellerShowcaseRouter.put('/:id', validateBody(showcaseUpdateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.shopShowcase.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
    });
    if (!existing) throw new NotFoundError('Etalase tidak ditemukan');
    const item = await prisma.shopShowcase.update({
      where: { id: existing.id },
      data: { ...(req.body.name !== undefined && { name: req.body.name }) },
    });
    return ok(res, item, 'Etalase diperbarui');
  } catch (err) { next(err); }
});

// DELETE /api/v1/seller/showcase/:id — cascade hanya membersihkan baris join,
// produknya sendiri tidak ikut terhapus.
sellerShowcaseRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.shopShowcase.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
    });
    if (!existing) throw new NotFoundError('Etalase tidak ditemukan');
    await prisma.shopShowcase.delete({ where: { id: existing.id } });
    return ok(res, null, 'Etalase dihapus');
  } catch (err) { next(err); }
});

// POST /api/v1/seller/showcase/:id/products — replace-all daftar produk.
sellerShowcaseRouter.post(
  '/:id/products',
  validateBody(showcaseAssignProductsSchema),
  async (req, res, next) => {
    try {
      const shopId = req.shop!.id;
      const showcase = await prisma.shopShowcase.findFirst({
        where: { id: req.params.id, shopId },
      });
      if (!showcase) throw new NotFoundError('Etalase tidak ditemukan');

      // Dedupe dulu supaya id kembar tidak menabrak PK gabungan saat createMany.
      const productIds = [...new Set(req.body.productIds as string[])];
      if (productIds.length > MAX_PRODUCTS_PER_SHOWCASE) {
        throw new BadRequestError(`Maksimal ${MAX_PRODUCTS_PER_SHOWCASE} produk per etalase`);
      }

      // Kepemilikan: semua id wajib produk toko ini. Tanpa cek ini seller bisa
      // menempelkan produk toko lain ke etalasenya.
      if (productIds.length > 0) {
        const owned = await prisma.product.count({
          where: { id: { in: productIds }, shopId, deletedAt: null },
        });
        if (owned !== productIds.length) {
          throw new ForbiddenError('Ada produk yang bukan milik tokomu');
        }
      }

      // Replace-all dalam satu transaksi — tidak ada state setengah jadi.
      await prisma.$transaction([
        prisma.shopShowcaseProduct.deleteMany({ where: { showcaseId: showcase.id } }),
        prisma.shopShowcaseProduct.createMany({
          data: productIds.map((productId, idx) => ({
            showcaseId: showcase.id,
            productId,
            order: idx,
          })),
        }),
      ]);

      return ok(res, { count: productIds.length }, 'Produk etalase diperbarui');
    } catch (err) { next(err); }
  },
);

// DELETE /api/v1/seller/showcase/:id/products/:productId — lepas satu produk.
sellerShowcaseRouter.delete('/:id/products/:productId', async (req, res, next) => {
  try {
    const showcase = await prisma.shopShowcase.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
    });
    if (!showcase) throw new NotFoundError('Etalase tidak ditemukan');
    const deleted = await prisma.shopShowcaseProduct.deleteMany({
      where: { showcaseId: showcase.id, productId: req.params.productId },
    });
    if (deleted.count === 0) throw new NotFoundError('Produk tidak ada di etalase ini');
    return ok(res, null, 'Produk dilepas dari etalase');
  } catch (err) { next(err); }
});

// POST /api/v1/seller/showcase/:id/move — tukar posisi dengan tetangga (▲▼).
sellerShowcaseRouter.post('/:id/move', validateBody(showcaseMoveSchema), async (req, res, next) => {
  try {
    const shopId = req.shop!.id;
    const items = await prisma.shopShowcase.findMany({
      where: { shopId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, order: true },
    });
    if (!items.some((it) => it.id === req.params.id)) {
      throw new NotFoundError('Etalase tidak ditemukan');
    }

    const reordered = swapAndNormalize(items, req.params.id, req.body.direction);
    // null = sudah di ujung; bukan error, cukup tidak ada perubahan.
    if (!reordered) return ok(res, null, 'Sudah di ujung, tidak ada yang ditukar');

    await prisma.$transaction(
      reordered.map((it) =>
        prisma.shopShowcase.update({ where: { id: it.id }, data: { order: it.order } }),
      ),
    );

    return ok(res, null, 'Urutan etalase diperbarui');
  } catch (err) { next(err); }
});
