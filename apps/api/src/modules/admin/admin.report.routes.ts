import { Router } from 'express';
import { prisma, Prisma } from '@tokopudidi/database';
import { resolveReportSchema } from '@tokopudidi/shared';
import { ok } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError } from '../../lib/errors';

export const adminReportRouter = Router();
adminReportRouter.use(requireAuth, requireRole('ADMIN'));

type TargetInfo = { label: string; linkUrl: string | null };

// Ambil ringkasan target untuk ditampilkan di queue (batch per tipe).
async function resolveTargetInfos(
  reports: { targetType: string; targetId: string }[],
): Promise<Map<string, TargetInfo>> {
  const byType = new Map<string, string[]>();
  for (const r of reports) {
    const list = byType.get(r.targetType) ?? [];
    list.push(r.targetId);
    byType.set(r.targetType, list);
  }
  const out = new Map<string, TargetInfo>();
  const key = (t: string, id: string) => `${t}:${id}`;

  if (byType.has('PRODUCT')) {
    const rows = await prisma.product.findMany({
      where: { id: { in: byType.get('PRODUCT')! } },
      select: { id: true, name: true, slug: true, isActive: true },
    });
    for (const p of rows) out.set(key('PRODUCT', p.id), { label: `${p.name}${p.isActive ? '' : ' (nonaktif)'}`, linkUrl: `/produk/${p.slug}` });
  }
  if (byType.has('REVIEW')) {
    const rows = await prisma.review.findMany({
      where: { id: { in: byType.get('REVIEW')! } },
      select: { id: true, comment: true, rating: true, product: { select: { slug: true, name: true } } },
    });
    for (const r of rows) out.set(key('REVIEW', r.id), { label: `Ulasan ${r.rating}★ di ${r.product.name}: "${(r.comment ?? '').slice(0, 60)}"`, linkUrl: `/produk/${r.product.slug}` });
  }
  if (byType.has('SHOP')) {
    const rows = await prisma.shop.findMany({
      where: { id: { in: byType.get('SHOP')! } },
      select: { id: true, name: true, slug: true },
    });
    for (const s of rows) out.set(key('SHOP', s.id), { label: `Toko ${s.name}`, linkUrl: `/toko/${s.slug}` });
  }
  if (byType.has('DISCUSSION')) {
    const rows = await prisma.discussion.findMany({
      where: { id: { in: byType.get('DISCUSSION')! } },
      select: { id: true, message: true, deletedAt: true, product: { select: { slug: true, name: true } } },
    });
    for (const d of rows) out.set(key('DISCUSSION', d.id), { label: `Diskusi di ${d.product.name}: "${d.message.slice(0, 60)}"${d.deletedAt ? ' (sudah dihapus)' : ''}`, linkUrl: `/produk/${d.product.slug}` });
  }
  if (byType.has('USER')) {
    const rows = await prisma.user.findMany({
      where: { id: { in: byType.get('USER')! } },
      select: { id: true, fullName: true, phone: true },
    });
    for (const u of rows) out.set(key('USER', u.id), { label: `${u.fullName} (${u.phone})`, linkUrl: null });
  }
  return out;
}

// GET /api/v1/admin/reports?status=&type=&page=
adminReportRouter.get('/', async (req, res, next) => {
  try {
    const status = String(req.query.status ?? 'OPEN'); // OPEN | REVIEWING | ACTIONED | DISMISSED | ALL
    const type = String(req.query.type ?? 'ALL');
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Number(req.query.limit ?? 20));

    const where: Prisma.ReportWhereInput = {};
    if (status !== 'ALL') where.status = status as Prisma.EnumReportStatusFilter['equals'];
    if (type !== 'ALL') where.targetType = type as Prisma.EnumReportTargetTypeFilter['equals'];

    const [total, items] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { reporter: { select: { id: true, fullName: true, phone: true } } },
      }),
    ]);

    const targetInfos = await resolveTargetInfos(items);
    const withTarget = items.map((r) => ({
      ...r,
      target: targetInfos.get(`${r.targetType}:${r.targetId}`) ?? { label: '(target sudah tidak ada)', linkUrl: null },
    }));

    return ok(res, { items: withTarget, total, page, limit });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/reports/:id/resolve — { action: ACTIONED|DISMISSED, note? }
adminReportRouter.post('/:id/resolve', validateBody(resolveReportSchema), async (req, res, next) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) throw new NotFoundError('Laporan tidak ditemukan');
    if (report.status === 'ACTIONED' || report.status === 'DISMISSED') {
      throw new BadRequestError('Laporan ini sudah diproses');
    }

    const { action, note } = req.body as { action: 'ACTIONED' | 'DISMISSED'; note?: string };

    await prisma.$transaction(async (tx) => {
      // ACTIONED → aksi otomatis per tipe target.
      if (action === 'ACTIONED') {
        if (report.targetType === 'PRODUCT') {
          const product = await tx.product.findFirst({
            where: { id: report.targetId, deletedAt: null },
            include: { shop: { select: { ownerId: true } } },
          });
          if (product) {
            await tx.product.update({ where: { id: product.id }, data: { isActive: false } });
            await tx.notification.create({
              data: {
                userId: product.shop.ownerId,
                type: 'SYSTEM',
                title: 'Produk diturunkan admin',
                body: `Produk "${product.name}" diturunkan dari etalase karena dilaporkan. Alasan: ${report.reason}`,
                linkUrl: `/seller/produk/${product.id}/edit`,
              },
            });
          }
        } else if (report.targetType === 'REVIEW') {
          await tx.review.update({ where: { id: report.targetId }, data: { isHidden: true } }).catch(() => undefined);
        } else if (report.targetType === 'DISCUSSION') {
          await tx.discussion.update({ where: { id: report.targetId }, data: { deletedAt: new Date() } }).catch(() => undefined);
        }
        // SHOP / USER: tindakan manual via panel admin existing (suspend dsb).
      }

      await tx.report.update({
        where: { id: report.id },
        data: { status: action, adminNote: note || null, resolvedAt: new Date() },
      });

      // Kabari pelapor keputusan admin.
      await tx.notification.create({
        data: {
          userId: report.reporterId,
          type: 'SYSTEM',
          title: action === 'ACTIONED' ? 'Laporanmu ditindaklanjuti ✅' : 'Laporanmu sudah ditinjau',
          body:
            action === 'ACTIONED'
              ? `Terima kasih! Laporanmu ("${report.reason}") sudah kami tindak lanjuti.${note ? ` Catatan: ${note}` : ''}`
              : `Laporanmu ("${report.reason}") sudah ditinjau dan tidak ditemukan pelanggaran.${note ? ` Catatan: ${note}` : ''}`,
          linkUrl: null,
        },
      });
    });

    return ok(res, null, action === 'ACTIONED' ? 'Laporan ditindaklanjuti' : 'Laporan diabaikan');
  } catch (err) { next(err); }
});
