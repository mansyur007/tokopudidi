import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { suspendSchema } from '@tokopudidi/shared';
import { ok } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { NotFoundError } from '../../lib/errors';

export const adminProductRouter = Router();
adminProductRouter.use(requireAuth, requireRole('ADMIN'));

// GET /api/v1/admin/products?q=&status=&page=
adminProductRouter.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const status = String(req.query.status ?? 'ALL'); // ALL | ACTIVE | TAKEN_DOWN
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Number(req.query.limit ?? 20));

    const where = {
      deletedAt: null,
      ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
      ...(status === 'ACTIVE' ? { isActive: true } : {}),
      ...(status === 'TAKEN_DOWN' ? { isActive: false } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, name: true, slug: true, price: true, stock: true,
          isActive: true, soldCount: true, ratingAvg: true, createdAt: true,
          images: { take: 1, orderBy: { order: 'asc' }, select: { url: true } },
          shop: { select: { id: true, name: true, slug: true } },
          category: { select: { name: true } },
        },
      }),
    ]);
    return ok(res, { items, total, page, limit });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/products/:id/takedown — sembunyikan dari pembeli.
adminProductRouter.post('/:id/takedown', validateBody(suspendSchema), async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { shop: { select: { ownerId: true } } },
    });
    if (!product) throw new NotFoundError('Produk tidak ditemukan');

    await prisma.product.update({ where: { id: product.id }, data: { isActive: false } });
    await prisma.notification.create({
      data: {
        userId: product.shop.ownerId,
        type: 'SYSTEM',
        title: 'Produk diturunkan admin',
        body: `Produk "${product.name}" diturunkan dari etalase. Alasan: ${req.body.reason}`,
        linkUrl: `/seller/produk/${product.id}/edit`,
      },
    });
    return ok(res, null, 'Produk diturunkan');
  } catch (err) { next(err); }
});

// POST /api/v1/admin/products/:id/restore
adminProductRouter.post('/:id/restore', async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!product) throw new NotFoundError('Produk tidak ditemukan');
    await prisma.product.update({ where: { id: product.id }, data: { isActive: true } });
    return ok(res, null, 'Produk dikembalikan ke etalase');
  } catch (err) { next(err); }
});
