import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { suspendSchema } from '@tokopudidi/shared';
import { ok } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError } from '../../lib/errors';

export const adminShopRouter = Router();
adminShopRouter.use(requireAuth, requireRole('ADMIN'));

// GET /api/v1/admin/shops?q=&status=&page=
adminShopRouter.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const status = String(req.query.status ?? 'ALL'); // ALL | PENDING_KTP | VERIFIED | SUSPENDED
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Number(req.query.limit ?? 20));

    const where = {
      ...(status === 'SUSPENDED' ? { deletedAt: { not: null } } : { deletedAt: null }),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { slug: { contains: q, mode: 'insensitive' as const } },
              { city: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(status === 'PENDING_KTP' ? { ktpVerified: false } : {}),
      ...(status === 'VERIFIED' ? { ktpVerified: true } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.shop.count({ where }),
      prisma.shop.findMany({
        where,
        orderBy: { joinedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, name: true, slug: true, city: true, province: true,
          ktpVerified: true, isOpen: true, ratingAvg: true, ratingCount: true,
          totalSold: true, balance: true, joinedAt: true, deletedAt: true,
          owner: { select: { id: true, fullName: true, phone: true } },
          _count: { select: { products: true, orders: true } },
        },
      }),
    ]);
    return ok(res, { items, total, page, limit });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/shops/:id — detail termasuk ktpUrl (akses admin saja).
adminShopRouter.get('/:id', async (req, res, next) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, fullName: true, phone: true, email: true, createdAt: true } },
        _count: { select: { products: true, orders: true, withdrawals: true } },
      },
    });
    if (!shop) throw new NotFoundError('Toko tidak ditemukan');
    return ok(res, shop);
  } catch (err) { next(err); }
});

// POST /api/v1/admin/shops/:id/verify-ktp
adminShopRouter.post('/:id/verify-ktp', async (req, res, next) => {
  try {
    const shop = await prisma.shop.findUnique({ where: { id: req.params.id } });
    if (!shop) throw new NotFoundError('Toko tidak ditemukan');
    if (shop.ktpVerified) throw new BadRequestError('Toko sudah terverifikasi');

    await prisma.shop.update({ where: { id: shop.id }, data: { ktpVerified: true } });
    await prisma.notification.create({
      data: {
        userId: shop.ownerId,
        type: 'SYSTEM',
        title: 'Toko terverifikasi ✅',
        body: `Selamat! Toko "${shop.name}" sudah terverifikasi. Badge centang akan muncul di tokomu.`,
        linkUrl: '/seller',
      },
    });
    return ok(res, null, 'KTP toko diverifikasi');
  } catch (err) { next(err); }
});

// POST /api/v1/admin/shops/:id/suspend — soft delete + nonaktifkan produk.
adminShopRouter.post('/:id/suspend', validateBody(suspendSchema), async (req, res, next) => {
  try {
    const shop = await prisma.shop.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!shop) throw new NotFoundError('Toko tidak ditemukan');

    await prisma.$transaction(async (tx) => {
      await tx.shop.update({ where: { id: shop.id }, data: { deletedAt: new Date(), isOpen: false, closedReason: req.body.reason } });
      await tx.product.updateMany({ where: { shopId: shop.id }, data: { isActive: false } });
      await tx.notification.create({
        data: {
          userId: shop.ownerId,
          type: 'SYSTEM',
          title: 'Toko ditangguhkan',
          body: `Toko "${shop.name}" ditangguhkan admin. Alasan: ${req.body.reason}`,
          linkUrl: '/seller',
        },
      });
    });
    return ok(res, null, 'Toko ditangguhkan');
  } catch (err) { next(err); }
});

// POST /api/v1/admin/shops/:id/unsuspend
adminShopRouter.post('/:id/unsuspend', async (req, res, next) => {
  try {
    const shop = await prisma.shop.findUnique({ where: { id: req.params.id } });
    if (!shop) throw new NotFoundError('Toko tidak ditemukan');
    if (!shop.deletedAt) throw new BadRequestError('Toko tidak sedang ditangguhkan');
    await prisma.shop.update({ where: { id: shop.id }, data: { deletedAt: null, closedReason: null } });
    return ok(res, null, 'Penangguhan toko dicabut');
  } catch (err) { next(err); }
});
