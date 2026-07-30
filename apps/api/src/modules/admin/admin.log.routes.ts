import { Router } from 'express';
import { prisma, Prisma } from '@tokopudidi/database';
import { adminLogQuerySchema } from '@tokopudidi/shared';
import { ok } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';
import { BadRequestError } from '../../lib/errors';

// Viewer jejak audit admin (M12-C3).
//
// **Hanya GET.** Tidak ada POST/PATCH/DELETE di router ini — append-only bukan
// dijaga oleh flag atau permission, tapi karena endpoint-nya tidak ada.
// Penulisannya lewat `logAdmin` di route aksinya masing-masing.
export const adminLogRouter = Router();
adminLogRouter.use(requireAuth, requireRole('ADMIN'));

/**
 * Batas akhir rentang tanggal, inklusif.
 *
 * `to=2026-07-30` dibaca `new Date()` sebagai tengah malam awal hari itu, jadi
 * memakainya langsung akan **membuang seluruh isi hari terakhir** — kesalahan
 * yang paling gampang lolos di filter tanggal. Karena itu dimajukan ke awal
 * hari berikutnya dan dibandingkan dengan `lt`, bukan `lte`.
 */
function akhirHariEksklusif(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new BadRequestError('Tanggal "to" tidak valid');
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

// GET /api/v1/admin/logs?adminId=&action=&targetType=&targetId=&from=&to=&page=&limit=
adminLogRouter.get('/', async (req, res, next) => {
  try {
    const parsed = adminLogQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Filter tidak valid');
    }
    const { adminId, action, targetType, targetId, from, to, page, limit } = parsed.data;

    let createdAt: Prisma.DateTimeFilter | undefined;
    if (from || to) {
      createdAt = {};
      if (from) {
        const d = new Date(from);
        if (Number.isNaN(d.getTime())) throw new BadRequestError('Tanggal "from" tidak valid');
        d.setHours(0, 0, 0, 0);
        createdAt.gte = d;
      }
      if (to) createdAt.lt = akhirHariEksklusif(to);
    }

    const where: Prisma.AdminLogWhereInput = {
      ...(adminId ? { adminId } : {}),
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
      ...(targetId ? { targetId } : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.adminLog.count({ where }),
      prisma.adminLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { admin: { select: { id: true, fullName: true, phone: true } } },
      }),
    ]);

    return ok(res, { items, total, page, limit });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/logs/admins — daftar admin yang pernah punya entri, untuk
// mengisi dropdown filter tanpa memuat seluruh tabel user.
adminLogRouter.get('/admins', async (_req, res, next) => {
  try {
    const rows = await prisma.adminLog.groupBy({
      by: ['adminId'],
      _count: { adminId: true },
    });
    const admins = await prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.adminId) } },
      select: { id: true, fullName: true },
    });
    const jumlah = new Map(rows.map((r) => [r.adminId, r._count.adminId]));
    return ok(
      res,
      admins
        .map((a) => ({ ...a, count: jumlah.get(a.id) ?? 0 }))
        .sort((a, b) => b.count - a.count),
    );
  } catch (err) { next(err); }
});
