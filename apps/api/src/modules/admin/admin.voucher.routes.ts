import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { adminVoucherCreateSchema, adminVoucherUpdateSchema } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError } from '../../lib/errors';
import { logAdmin } from '../../lib/adminLog';

/** Tolak categoryId yang tidak menunjuk kategori mana pun. */
async function pastikanKategoriAda(categoryId: string | null | undefined): Promise<void> {
  if (!categoryId) return;
  const ada = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!ada) throw new BadRequestError('Kategori tidak ditemukan');
}

export const adminVoucherRouter = Router();
adminVoucherRouter.use(requireAuth, requireRole('ADMIN'));

// GET /api/v1/admin/voucher?scope=platform|shop|all — default platform.
adminVoucherRouter.get('/', async (req, res, next) => {
  try {
    const scope = String(req.query.scope ?? 'platform');
    const where =
      scope === 'shop' ? { shopId: { not: null } }
      : scope === 'all' ? {}
      : { shopId: null };
    const items = await prisma.promoCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        shop: { select: { name: true, slug: true } },
        category: { select: { id: true, name: true } },
      },
    });
    return ok(res, items);
  } catch (err) { next(err); }
});

// POST /api/v1/admin/voucher — voucher platform (shopId null).
adminVoucherRouter.post('/', validateBody(adminVoucherCreateSchema), async (req, res, next) => {
  try {
    const exists = await prisma.promoCode.findUnique({ where: { code: req.body.code } });
    if (exists) throw new BadRequestError('Kode voucher sudah dipakai, pilih kode lain');

    // Kategori wajib benar-benar ada: FK-nya `onDelete: SetNull`, jadi id ngawur
    // tidak ditolak database melainkan diterima lalu diam-diam jadi null —
    // voucher yang dikira ter-scope kategori berubah jadi berlaku untuk semua.
    await pastikanKategoriAda(req.body.categoryId);

    const item = await prisma.promoCode.create({
      data: {
        code: req.body.code,
        discountType: req.body.discountType,
        discountValue: req.body.discountValue,
        minPurchase: req.body.minPurchase ?? 0,
        maxDiscount: req.body.maxDiscount ?? null,
        usageLimit: req.body.usageLimit ?? null,
        validFrom: new Date(req.body.validFrom),
        validUntil: new Date(req.body.validUntil),
        categoryId: req.body.categoryId ?? null,
      },
    });
    logAdmin(req.user!.sub, 'CREATE_VOUCHER', {
      targetType: 'VOUCHER', targetId: item.id, payload: req.body, note: item.code,
    });
    return created(res, item, 'Voucher platform dibuat');
  } catch (err) { next(err); }
});

// PUT /api/v1/admin/voucher/:id — hanya voucher platform.
adminVoucherRouter.put('/:id', validateBody(adminVoucherUpdateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.promoCode.findFirst({
      where: { id: req.params.id, shopId: null },
    });
    if (!existing) throw new NotFoundError('Voucher platform tidak ditemukan');
    if (req.body.categoryId !== undefined) await pastikanKategoriAda(req.body.categoryId);

    const item = await prisma.promoCode.update({
      where: { id: existing.id },
      data: {
        ...(req.body.discountType !== undefined && { discountType: req.body.discountType }),
        ...(req.body.discountValue !== undefined && { discountValue: req.body.discountValue }),
        ...(req.body.minPurchase !== undefined && { minPurchase: req.body.minPurchase }),
        ...(req.body.maxDiscount !== undefined && { maxDiscount: req.body.maxDiscount }),
        ...(req.body.usageLimit !== undefined && { usageLimit: req.body.usageLimit }),
        ...(req.body.validFrom !== undefined && { validFrom: new Date(req.body.validFrom) }),
        ...(req.body.validUntil !== undefined && { validUntil: new Date(req.body.validUntil) }),
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
        // `null` eksplisit = lepas pembatasan kategori; `undefined` = jangan sentuh.
        ...(req.body.categoryId !== undefined && { categoryId: req.body.categoryId }),
      },
    });
    logAdmin(req.user!.sub, 'UPDATE_VOUCHER', {
      targetType: 'VOUCHER', targetId: item.id, payload: req.body, note: item.code,
    });
    return ok(res, item, 'Voucher diperbarui');
  } catch (err) { next(err); }
});

// DELETE /api/v1/admin/voucher/:id — hanya voucher platform.
adminVoucherRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.promoCode.findFirst({
      where: { id: req.params.id, shopId: null },
    });
    if (!existing) throw new NotFoundError('Voucher platform tidak ditemukan');
    await prisma.promoCode.delete({ where: { id: existing.id } });
    logAdmin(req.user!.sub, 'DELETE_VOUCHER', {
      targetType: 'VOUCHER', targetId: existing.id, note: existing.code,
    });
    return ok(res, null, 'Voucher dihapus');
  } catch (err) { next(err); }
});
