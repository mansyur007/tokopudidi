import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { productCreateSchema, productUpdateSchema, slugify } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { requireShopOwner } from './seller.middleware';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError } from '../../lib/errors';

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
        variants: true,
        category: true,
      },
    });
    if (!product) throw new NotFoundError('Produk tidak ditemukan');
    return ok(res, product);
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
          isActive: req.body.isActive,
          images: {
            create: req.body.imageUrls.map((url: string, order: number) => ({ url, order })),
          },
        },
      });
      if (req.body.variants?.length) {
        for (const v of req.body.variants) {
          await tx.productVariant.create({
            data: {
              productId: p.id,
              name: v.name,
              priceModifier: v.priceModifier ?? 0,
              stock: v.stock,
            },
          });
        }
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

    const { imageUrls, variants, ...rest } = req.body;

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

      // Replace varian kalau dikirim.
      if (variants) {
        const incomingIds = (variants as Array<{ id?: string }>).map((v) => v.id).filter(Boolean) as string[];
        await tx.productVariant.deleteMany({
          where: { productId: existing.id, id: { notIn: incomingIds.length ? incomingIds : ['00000000-0000-0000-0000-000000000000'] } },
        });
        for (const v of variants as Array<{ id?: string; name: string; priceModifier?: number; stock: number }>) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: { name: v.name, priceModifier: v.priceModifier ?? 0, stock: v.stock },
            }).catch(() => undefined);
          } else {
            await tx.productVariant.create({
              data: { productId: existing.id, name: v.name, priceModifier: v.priceModifier ?? 0, stock: v.stock },
            });
          }
        }
      }
      return tx.product.findUnique({
        where: { id: existing.id },
        include: { images: true, variants: true },
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
