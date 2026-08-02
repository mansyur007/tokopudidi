import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import {
  flashSaleCreateSchema,
  flashSaleUpdateSchema,
  flashSaleItemCreateSchema,
  flashSaleItemUpdateSchema,
} from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError, UnprocessableEntityError } from '../../lib/errors';
import { logAdmin } from '../../lib/adminLog';

// Flash sale (M15-C1) — CRUD event + kelola slot produknya.

export const adminFlashSaleRouter = Router();
adminFlashSaleRouter.use(requireAuth, requireRole('ADMIN'));

const ITEM_SELECT = {
  id: true, salePrice: true, quota: true, soldCount: true,
  product: {
    select: {
      id: true, name: true, slug: true, price: true, stock: true,
      images: { orderBy: { order: 'asc' as const }, take: 1, select: { url: true } },
      shop: { select: { name: true } },
    },
  },
};

/**
 * Produk yang sama tidak boleh punya dua harga flash pada jam yang sama.
 *
 * Pemeriksaannya menyertakan event yang sedang dijeda (`isActive: false`).
 * Itu disengaja: event yang dijeda masih memesan jendela waktunya, dan kalau
 * jeda dianggap "bebas", mengaktifkannya kembali bisa diam-diam menghasilkan
 * dua harga flash yang berlaku bersamaan — tepat keadaan yang tidak bisa
 * diselesaikan `resolveFlashPrices` selain dengan menebak.
 */
async function cariTumpangTindih(
  productIds: string[],
  periode: { startAt: Date; endAt: Date },
  kecualiEventId: string,
) {
  if (productIds.length === 0) return [];
  return prisma.flashSaleItem.findMany({
    where: {
      productId: { in: productIds },
      flashSaleId: { not: kecualiEventId },
      flashSale: { startAt: { lt: periode.endAt }, endAt: { gt: periode.startAt } },
    },
    select: {
      productId: true,
      product: { select: { name: true } },
      flashSale: { select: { name: true } },
    },
  });
}

// ===== Event =====

adminFlashSaleRouter.get('/', async (_req, res, next) => {
  try {
    const items = await prisma.flashSale.findMany({
      orderBy: { startAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
    return ok(res, items);
  } catch (err) { next(err); }
});

adminFlashSaleRouter.get('/:id', async (req, res, next) => {
  try {
    const event = await prisma.flashSale.findUnique({
      where: { id: req.params.id },
      include: { items: { select: ITEM_SELECT, orderBy: { salePrice: 'asc' } } },
    });
    if (!event) throw new NotFoundError('Event flash sale tidak ditemukan');
    return ok(res, event);
  } catch (err) { next(err); }
});

adminFlashSaleRouter.post('/', validateBody(flashSaleCreateSchema), async (req, res, next) => {
  try {
    const event = await prisma.flashSale.create({
      data: {
        name: req.body.name,
        startAt: new Date(req.body.startAt),
        endAt: new Date(req.body.endAt),
        isActive: req.body.isActive ?? true,
      },
    });
    logAdmin(req.user!.sub, 'CREATE_FLASH_SALE', {
      targetType: 'FLASH_SALE', targetId: event.id, payload: req.body, note: event.name,
    });
    return created(res, event, 'Event flash sale dibuat');
  } catch (err) { next(err); }
});

adminFlashSaleRouter.put('/:id', validateBody(flashSaleUpdateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.flashSale.findUnique({
      where: { id: req.params.id },
      include: { items: { select: { productId: true } } },
    });
    if (!existing) throw new NotFoundError('Event flash sale tidak ditemukan');

    const startAt = req.body.startAt ? new Date(req.body.startAt) : existing.startAt;
    const endAt = req.body.endAt ? new Date(req.body.endAt) : existing.endAt;
    // Digabung dengan nilai lama dulu baru dibandingkan — kalau yang dikirim
    // cuma salah satu sisi, zod tidak punya pembandingnya.
    if (endAt <= startAt) {
      throw new BadRequestError('Waktu berakhir harus setelah waktu mulai');
    }

    // Menggeser periode bisa membuat slot yang tadinya aman jadi bertabrakan.
    // Tanpa pemeriksaan ini, aturan "satu harga flash per produk per jam" hanya
    // ditegakkan di pintu masuk slot dan bocor lewat pintu edit event.
    if (req.body.startAt || req.body.endAt) {
      const bentrok = await cariTumpangTindih(
        existing.items.map((it) => it.productId),
        { startAt, endAt },
        existing.id,
      );
      if (bentrok.length > 0) {
        throw new UnprocessableEntityError(
          `Periode itu bertabrakan dengan event lain untuk ${bentrok.length} produk`,
          Object.fromEntries(
            bentrok.map((b) => [b.productId, [`"${b.product.name}" sudah ada di event "${b.flashSale.name}"`]]),
          ),
        );
      }
    }

    const event = await prisma.flashSale.update({
      where: { id: existing.id },
      data: {
        ...(req.body.name !== undefined && { name: req.body.name }),
        ...(req.body.startAt !== undefined && { startAt }),
        ...(req.body.endAt !== undefined && { endAt }),
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
      },
    });
    logAdmin(req.user!.sub, 'UPDATE_FLASH_SALE', {
      targetType: 'FLASH_SALE', targetId: event.id, payload: req.body, note: event.name,
    });
    return ok(res, event, 'Event flash sale diperbarui');
  } catch (err) { next(err); }
});

adminFlashSaleRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.flashSale.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Event flash sale tidak ditemukan');

    // Slot yang pernah dipakai belanja orang tidak boleh lenyap: `OrderItem`
    // menunjuk ke sana untuk melepas kuota saat pesanan batal, dan menghapusnya
    // memutus tautan itu (FK-nya SET NULL) sehingga pembatalan berikutnya diam
    // saja. Jeda event kalau tujuannya sekadar menghentikan penjualan.
    const terpakai = await prisma.orderItem.count({
      where: { flashSaleItem: { flashSaleId: existing.id } },
    });
    if (terpakai > 0) {
      throw new UnprocessableEntityError(
        `Event ini sudah dipakai ${terpakai} baris pesanan, jadi tidak bisa dihapus. Jeda saja lewat tombol Jeda.`,
      );
    }

    await prisma.flashSale.delete({ where: { id: existing.id } });
    logAdmin(req.user!.sub, 'DELETE_FLASH_SALE', {
      targetType: 'FLASH_SALE', targetId: existing.id, note: existing.name,
    });
    return ok(res, null, 'Event flash sale dihapus');
  } catch (err) { next(err); }
});

// ===== Slot produk =====

adminFlashSaleRouter.post('/:id/items', validateBody(flashSaleItemCreateSchema), async (req, res, next) => {
  try {
    const event = await prisma.flashSale.findUnique({ where: { id: req.params.id } });
    if (!event) throw new NotFoundError('Event flash sale tidak ditemukan');

    const product = await prisma.product.findFirst({
      where: { id: req.body.productId, deletedAt: null },
      select: { id: true, name: true, price: true, stock: true },
    });
    if (!product) throw new NotFoundError('Produk tidak ditemukan');

    // Harga flash yang tidak lebih murah dari harga normal bukan promo, cuma
    // label. Ditolak di sini supaya tidak perlu dijelaskan lagi di sisi pembeli.
    if (req.body.salePrice >= product.price) {
      throw new UnprocessableEntityError(
        `Harga flash harus di bawah harga normal produk (Rp ${product.price.toLocaleString('id-ID')})`,
      );
    }

    const bentrok = await cariTumpangTindih([product.id], event, event.id);
    if (bentrok.length > 0) {
      throw new UnprocessableEntityError(
        `"${product.name}" sudah ikut event "${bentrok[0].flashSale.name}" yang periodenya bertabrakan`,
      );
    }

    const sudahAda = await prisma.flashSaleItem.findUnique({
      where: { flashSaleId_productId: { flashSaleId: event.id, productId: product.id } },
    });
    if (sudahAda) throw new BadRequestError('Produk ini sudah ada di event ini');

    const item = await prisma.flashSaleItem.create({
      data: {
        flashSaleId: event.id,
        productId: product.id,
        salePrice: req.body.salePrice,
        quota: req.body.quota,
      },
      select: ITEM_SELECT,
    });
    logAdmin(req.user!.sub, 'CREATE_FLASH_SALE_ITEM', {
      targetType: 'FLASH_SALE', targetId: event.id, payload: req.body, note: product.name,
    });

    // Peringatan, bukan penolakan: kuota di atas stok tidak merusak apa pun —
    // stok tetap dijaga terpisah saat checkout — dan admin sering sengaja
    // menyiapkan kuota lebih dulu sebelum seller menambah stok.
    const warnings = req.body.quota > product.stock
      ? [`Kuota ${req.body.quota} melebihi stok produk saat ini (${product.stock})`]
      : [];
    return created(res, { ...item, warnings }, 'Produk ditambahkan ke flash sale');
  } catch (err) { next(err); }
});

adminFlashSaleRouter.put('/:id/items/:itemId', validateBody(flashSaleItemUpdateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.flashSaleItem.findFirst({
      where: { id: req.params.itemId, flashSaleId: req.params.id },
      include: { product: { select: { price: true, stock: true, name: true } } },
    });
    if (!existing) throw new NotFoundError('Slot flash sale tidak ditemukan');

    if (req.body.salePrice !== undefined && req.body.salePrice >= existing.product.price) {
      throw new UnprocessableEntityError(
        `Harga flash harus di bawah harga normal produk (Rp ${existing.product.price.toLocaleString('id-ID')})`,
      );
    }
    // Kuota tidak boleh turun di bawah yang sudah telanjur terjual: selisihnya
    // akan membuat `remaining` negatif, dan slot yang sudah dibayar orang tidak
    // bisa ditarik kembali.
    if (req.body.quota !== undefined && req.body.quota < existing.soldCount) {
      throw new UnprocessableEntityError(
        `Kuota tidak bisa di bawah ${existing.soldCount} yang sudah terjual`,
      );
    }

    const item = await prisma.flashSaleItem.update({
      where: { id: existing.id },
      data: {
        ...(req.body.salePrice !== undefined && { salePrice: req.body.salePrice }),
        ...(req.body.quota !== undefined && { quota: req.body.quota }),
      },
      select: ITEM_SELECT,
    });
    logAdmin(req.user!.sub, 'UPDATE_FLASH_SALE_ITEM', {
      targetType: 'FLASH_SALE', targetId: req.params.id, payload: req.body, note: existing.product.name,
    });

    const warnings = item.quota > existing.product.stock
      ? [`Kuota ${item.quota} melebihi stok produk saat ini (${existing.product.stock})`]
      : [];
    return ok(res, { ...item, warnings }, 'Slot flash sale diperbarui');
  } catch (err) { next(err); }
});

adminFlashSaleRouter.delete('/:id/items/:itemId', async (req, res, next) => {
  try {
    const existing = await prisma.flashSaleItem.findFirst({
      where: { id: req.params.itemId, flashSaleId: req.params.id },
      include: { product: { select: { name: true } } },
    });
    if (!existing) throw new NotFoundError('Slot flash sale tidak ditemukan');

    // Alasan yang sama dengan penghapusan event: `soldCount` yang sudah kembali
    // ke 0 (semua pesanannya batal) TIDAK berarti tidak ada yang menunjuk ke
    // sini — baris pesanan yang batal itu tetap ada, dan menghapus slotnya
    // membuat pembatalan/refund berikutnya kehilangan sasaran pelepasan kuota.
    const terpakai = await prisma.orderItem.count({ where: { flashSaleItemId: existing.id } });
    if (terpakai > 0) {
      throw new UnprocessableEntityError(
        `Slot ini sudah dipakai ${terpakai} baris pesanan, jadi tidak bisa dihapus. Turunkan kuotanya ke jumlah terjual kalau mau menghentikan penjualan.`,
      );
    }

    await prisma.flashSaleItem.delete({ where: { id: existing.id } });
    logAdmin(req.user!.sub, 'DELETE_FLASH_SALE_ITEM', {
      targetType: 'FLASH_SALE', targetId: req.params.id, note: existing.product.name,
    });
    return ok(res, null, 'Produk dikeluarkan dari flash sale');
  } catch (err) { next(err); }
});
