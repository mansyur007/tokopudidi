import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { suspendSchema } from '@tokopudidi/shared';
import { ok } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError } from '../../lib/errors';

export const adminUserRouter = Router();
adminUserRouter.use(requireAuth, requireRole('ADMIN'));

// GET /api/v1/admin/users?q=&role=&status=&page=
adminUserRouter.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const role = String(req.query.role ?? 'ALL'); // ALL | BUYER | SELLER | ADMIN
    const status = String(req.query.status ?? 'ALL'); // ALL | ACTIVE | SUSPENDED
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Number(req.query.limit ?? 20));

    const where = {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' as const } },
              { phone: { contains: q } },
              { email: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(role !== 'ALL' ? { role: role as 'BUYER' | 'SELLER' | 'ADMIN' } : {}),
      ...(status === 'ACTIVE' ? { isSuspended: false } : {}),
      ...(status === 'SUSPENDED' ? { isSuspended: true } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, fullName: true, phone: true, email: true, role: true,
          isSuspended: true, isPhoneVerified: true, createdAt: true,
          shop: { select: { id: true, name: true, slug: true } },
        },
      }),
    ]);
    return ok(res, { items, total, page, limit });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/users/:id/suspend
adminUserRouter.post('/:id/suspend', validateBody(suspendSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!user) throw new NotFoundError('User tidak ditemukan');
    if (user.role === 'ADMIN') throw new BadRequestError('Tidak bisa menonaktifkan akun admin');
    if (user.id === req.user!.sub) throw new BadRequestError('Tidak bisa menonaktifkan akun sendiri');

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { isSuspended: true } });
      // Cabut semua refresh token supaya sesi langsung mati.
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Akun dinonaktifkan',
          body: `Akunmu dinonaktifkan admin. Alasan: ${req.body.reason}`,
        },
      });
    });
    return ok(res, null, 'User dinonaktifkan');
  } catch (err) { next(err); }
});

// POST /api/v1/admin/users/:id/unsuspend
adminUserRouter.post('/:id/unsuspend', async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!user) throw new NotFoundError('User tidak ditemukan');
    await prisma.user.update({ where: { id: user.id }, data: { isSuspended: false } });
    return ok(res, null, 'User diaktifkan kembali');
  } catch (err) { next(err); }
});
