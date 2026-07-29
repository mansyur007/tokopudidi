import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { productCreateSchema, productUpdateSchema, slugify } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { requireShopOwner } from './seller.middleware';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError } from '../../lib/errors';
import { getProductStats } from './product.stats';
import { writeProductVariants } from './variant.write';
import { withVariantValues } from '../product/variant.read';

export const sellerProductRouter = Router();
sellerProductRouter.use(requireAuth, requireShopOwner);

// GET /api/v1/seller/products
sellerProductRouter.get('/', async (req, res, next) => {
  try {
    const shopId = req.shop!.id;
    const q = String(req.query.q ?? '').trim();
    const status = String(req.query.status ?? 'ALL'); // ALL | ACTIVE | INACTIVE | LOW_STOCK
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Number(req.query.limit ?? 20));

    const where = {
      shopId,
      deletedAt: null,
      ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
      ...(status === 'ACTIVE' ? { isActive: true } : {}),
      ...(status === 'INACTIVE' ? { isActive: false } : {}),
      ...(status === 'LOW_STOCK' ? { stock: { lt: 5 } } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: { take: 1, orderBy: { order: 'asc' } },
          category: { select: { name: true, slug: true } },
        },
      }),
    ]);
    return ok(res, { items, total, page, limit });
  } catch (err) { next(err); }
});

// GET /api/v1/seller/products/:id
sellerProductRouter.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
      include: {
        images: { orderBy: { order: 'asc' } },
        // Seller melihat kombinasi aktif saja — yang nonaktif adalah sisa
        // kombinasi lama yang dipertahankan demi keranjang & riwayat pesanan.
        variants: {
          where: { isActive: true },
          include: {
            values: { select: { optionValue: { select: { id: true, value: true, option: { select: { order: true } } } } } },
          },
        },
        options: { orderBy: { order: 'asc' }, include: { values: { orderBy: { order: 'asc' } } } },
        category: true,
      },
    });
    if (!product) throw new NotFoundError('Produk tidak ditemukan');
    return ok(res, withVariantValues(product));
  } catch (err) { next(err); }
});

// GET /api/v1/seller/products/:id/stats?range=7d|30d — statistik per produk (M11-B4).
sellerProductRouter.get('/:id/stats', async (req, res, next) => {
  try {
    const stats = await getProductStats(req.shop!.id, req.params.id, req.query.range);
    // null = bukan milik toko ini atau tidak ada — jangan bedakan keduanya.
    if (!stats) throw new NotFoundError('Produk tidak ditemukan');
    return ok(res, stats);
  } catch (err) { next(err); }
});

async function uniqueProductSlug(name: string, shopSlug: string): Promise<string> {
  const base = slugify(`${name}-${shopSlug.slice(0, 6)}`);
  let slug = base;
  for (let i = 1; i < 30; i++) {
    const taken = await prisma.product.findUnique({ where: { slug } });
    if (!taken) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

// POST /api/v1/seller/products
sellerProductRouter.post('/', validateBody(productCreateSchema), async (req, res, next) => {
  try {
    const shopId = req.shop!.id;
    const shopSlug = req.shop!.slug;

    // Validasi kategori ada.
    const cat = await prisma.category.findUnique({ where: { id: req.body.categoryId } });
    if (!cat) throw new BadRequestError('Kategori tidak valid');

    const slug = await uniqueProductSlug(req.body.name, shopSlug);

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          shopId,
          categoryId: req.body.categoryId,
          name: req.body.name,
          slug,
          description: req.body.description,
          price: req.body.price,
          salePrice: req.body.salePrice ?? null,
          saleStartAt: req.body.saleStartAt ? new Date(req.body.saleStartAt) : null,
          saleEndAt: req.body.saleEndAt ? new Date(req.body.saleEndAt) : null,
          stock: req.body.stock,
          minOrderQty: req.body.minOrderQty,
          weight: req.body.weight,
          condition: req.body.condition,
          codAvailable: req.body.codAvailable,
          freeShippingEligible: req.body.freeShippingEligible,
          isActive: req.body.isActive,
          images: {
            create: req.body.imageUrls.map((url: string, order: number) => ({ url, order })),
          },
        },
      });
      if (req.body.options?.length && req.body.variants?.length) {
        await writeProductVariants(tx, p.id, req.body.options, req.body.variants);
      }
      return p;
    });
    return created(res, product, 'Produk berhasil ditambahkan');
  } catch (err) { next(err); }
});

// PATCH /api/v1/seller/products/:id
sellerProductRouter.patch('/:id', validateBody(productUpdateSchema), async (req, res, next) => {
  try {
    const shopId = req.shop!.id;
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, shopId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Produk tidak ditemukan');

    const { imageUrls, variants, options, ...rest } = req.body;

    // Konsistensi diskon periodik (M9-B3) — gabungan payload + data existing.
    const nextPrice = rest.price ?? existing.price;
    const nextSalePrice = rest.salePrice !== undefined ? rest.salePrice : existing.salePrice;
    if (nextSalePrice != null) {
      const start = rest.saleStartAt !== undefined ? rest.saleStartAt : existing.saleStartAt;
      const end = rest.saleEndAt !== undefined ? rest.saleEndAt : existing.saleEndAt;
      if (nextSalePrice >= nextPrice) throw new BadRequestError('Harga diskon harus lebih murah dari harga normal');
      if (!start || !end) throw new BadRequestError('Periode diskon wajib diisi');
      if (new Date(start) >= new Date(end)) throw new BadRequestError('Tanggal berakhir harus setelah tanggal mulai');
    } else if (rest.salePrice === null) {
      // Hapus diskon → bersihkan periodenya juga.
      rest.saleStartAt = null;
      rest.saleEndAt = null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: existing.id }, data: rest });

      // Replace gambar kalau dikirim.
      if (imageUrls) {
        await tx.productImage.deleteMany({ where: { productId: existing.id } });
        for (let i = 0; i < imageUrls.length; i++) {
          await tx.productImage.create({
            data: { productId: existing.id, url: imageUrls[i], order: i },
          });
        }
      }

      // Sinkronkan varian kalau dikirim. `options` dan `variants` selalu
      // berjalan bersama — zod sudah menolak variants tanpa options.
      if (variants || options) {
        await writeProductVariants(tx, existing.id, options ?? [], variants ?? []);
      }
      return tx.product.findUnique({
        where: { id: existing.id },
        include: {
          images: true,
          variants: { where: { isActive: true } },
          options: { orderBy: { order: 'asc' }, include: { values: { orderBy: { order: 'asc' } } } },
        },
      });
    });
    return ok(res, updated, 'Produk berhasil diupdate');
  } catch (err) { next(err); }
});

// DELETE /api/v1/seller/products/:id — soft delete
sellerProductRouter.delete('/:id', async (req, res, next) => {
  try {
    const shopId = req.shop!.id;
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, shopId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Produk tidak ditemukan');
    await prisma.product.update({
      where: { id: existing.id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return ok(res, null, 'Produk dihapus');
  } catch (err) { next(err); }
});

// POST /api/v1/seller/products/:id/duplicate
sellerProductRouter.post('/:id/duplicate', async (req, res, next) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, shopId: req.shop!.id },
      include: { images: true, variants: true },
    });
    if (!existing) throw new NotFoundError('Produk tidak ditemukan');
    const slug = await uniqueProductSlug(existing.name + ' Copy', req.shop!.slug);
    const dup = await prisma.product.create({
      data: {
        shopId: existing.shopId,
        categoryId: existing.categoryId,
        name: existing.name + ' (Salinan)',
        slug,
        description: existing.description,
        price: existing.price,
        stock: 0,
        minOrderQty: existing.minOrderQty,
        weight: existing.weight,
        condition: existing.condition,
        codAvailable: existing.codAvailable,
        freeShippingEligible: existing.freeShippingEligible,
        isActive: false,
        images: { create: existing.images.map((img, i) => ({ url: img.url, order: i })) },
        variants: {
          create: existing.variants.map((v) => ({
            name: v.name, priceModifier: v.priceModifier, stock: 0,
          })),
        },
      },
    });
    return created(res, dup, 'Produk berhasil diduplikasi (status nonaktif)');
  } catch (err) { next(err); }
});
