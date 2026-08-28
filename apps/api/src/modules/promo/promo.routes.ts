import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@tokopudidi/database';
import { ok } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { BadRequestError } from '../../lib/errors';
import { expandCategoryTree, subtotalDalamKategori, getUnitPrice } from '@tokopudidi/shared';
import { resolveFlashPrices } from '../flashSale/flashSale.service';

export const promoRouter = Router();

/**
 * Keranjang user + pohon kategori, dimuat SEKALI.
 *
 * Versi pertama menghitung ini per voucher di dalam loop `/available` — dua
 * query per voucher, jadi daftar 20 voucher berarti 40 query untuk menjawab
 * satu halaman picker. Konteksnya sama untuk semua voucher, jadi dimuat sekali
 * lalu dipakai bersama.
 */
async function muatKonteksKeranjang(userId: string) {
  const [cart, semuaKategori] = await Promise.all([
    prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true, categoryId: true, shopId: true, price: true,
                salePrice: true, saleStartAt: true, saleEndAt: true,
                wholesaleTiers: { select: { minQty: true, price: true } },
              },
            },
            variant: { select: { priceModifier: true } },
          },
        },
      },
    }),
    prisma.category.findMany({ select: { id: true, parentId: true } }),
  ]);

  // Harga satuan dihitung dengan helper yang SAMA dengan keranjang & checkout
  // (`getUnitPrice` + harga flash + modifier varian).
  //
  // Percobaan pertama memakai `product.price` mentah dengan alasan "harga
  // daftar cukup untuk menilai kelayakan" — dan itu keliru: untuk produk yang
  // sedang diskon, basisnya jadi lebih besar daripada yang benar-benar ditagih,
  // sehingga /validate menjanjikan potongan yang tidak akan direproduksi
  // checkout. Ketahuan karena TC-195 menghitung ekspektasinya dari harga yang
  // dilihat pembeli: 6.800 vs 4.700.
  const flashHits = await resolveFlashPrices((cart?.items ?? []).map((it) => it.productId));
  const items = (cart?.items ?? []).map((it) => {
    const flashPrice = flashHits.get(it.productId)?.salePrice ?? null;
    const harga =
      getUnitPrice({ ...it.product, flashPrice }, it.quantity) + (it.variant?.priceModifier ?? 0);
    return {
      categoryId: it.product.categoryId,
      shopId: it.product.shopId,
      subtotal: harga * it.quantity,
    };
  });
  return { items, semuaKategori };
}

type KonteksKeranjang = Awaited<ReturnType<typeof muatKonteksKeranjang>>;

/**
 * Dasar diskon untuk satu voucher. `null` = voucher tanpa scope kategori,
 * pemanggil memakai subtotal apa adanya.
 *
 * Dihitung **dari keranjang di server**, bukan dari angka `subtotal` kiriman
 * klien: klien tidak tahu (dan tidak boleh menentukan) item mana yang berhak.
 */
function basisKategori(
  ctx: KonteksKeranjang,
  categoryId: string | null,
  shopId: string | null,
): number | null {
  if (!categoryId) return null;
  const scope = expandCategoryTree(categoryId, ctx.semuaKategori);
  const berhak = shopId ? ctx.items.filter((it) => it.shopId === shopId) : ctx.items;
  return subtotalDalamKategori(berhak, scope);
}

// Hitung diskon efektif sebuah promo terhadap subtotal.
function computeDiscount(
  promo: { discountType: 'FIXED' | 'PERCENTAGE'; discountValue: number; maxDiscount: number | null },
  subtotal: number,
): number {
  let discount =
    promo.discountType === 'PERCENTAGE'
      ? Math.floor((subtotal * promo.discountValue) / 100)
      : promo.discountValue;
  if (promo.maxDiscount && discount > promo.maxDiscount) discount = promo.maxDiscount;
  if (discount > subtotal) discount = subtotal;
  return discount;
}

// GET /api/v1/promo/available?subtotal=&shopId= — daftar voucher untuk Voucher Picker (M9-A4).
// Voucher toko (shopId terisi, M9-B2) hanya muncul kalau query shopId cocok.
promoRouter.get('/available', requireAuth, async (req, res, next) => {
  try {
    const subtotal = Math.max(0, Number(req.query.subtotal ?? 0) || 0);
    const shopId = typeof req.query.shopId === 'string' && req.query.shopId ? req.query.shopId : null;
    const now = new Date();
    const ctx = await muatKonteksKeranjang(req.user!.sub);

    const promos = await prisma.promoCode.findMany({
      where: {
        isActive: true,
        validUntil: { gte: now },
        OR: [{ shopId: null }, ...(shopId ? [{ shopId }] : [])],
      },
      orderBy: [{ shopId: { sort: 'desc', nulls: 'last' } }, { validUntil: 'asc' }],
      include: { shop: { select: { name: true } }, category: { select: { name: true } } },
    });

    const eligible = [];
    const ineligible = [];
    for (const p of promos) {
      const base = {
        code: p.code,
        discountType: p.discountType,
        discountValue: p.discountValue,
        minPurchase: p.minPurchase,
        maxDiscount: p.maxDiscount,
        validUntil: p.validUntil,
        shopName: p.shop?.name ?? null, // terisi = voucher toko
        categoryName: p.category?.name ?? null, // terisi = voucher kategori (M9-C1)
      };

      // Voucher kategori dinilai terhadap subtotal item yang berhak saja —
      // memakai subtotal keranjang penuh akan menampilkan "hemat Rp X" yang
      // ditolak checkout beberapa detik kemudian.
      const basis = basisKategori(ctx, p.categoryId, p.shopId) ?? subtotal;

      let reason: string | null = null;
      if (now < p.validFrom) reason = 'Belum mulai berlaku';
      else if (p.usageLimit && p.usedCount >= p.usageLimit) reason = 'Kuota promo sudah habis';
      else if (p.categoryId && basis === 0) reason = `Tidak ada produk kategori ${p.category?.name ?? 'ini'} di keranjang`;
      else if (basis < p.minPurchase) reason = `Min. belanja Rp ${p.minPurchase.toLocaleString('id-ID')}`;

      if (reason) ineligible.push({ promo: base, reason });
      else eligible.push({ ...base, discountAmount: computeDiscount(p, basis) });
    }

    return ok(res, { eligible, ineligible });
  } catch (err) { next(err); }
});

const validateSchema = z.object({
  code: z.string().trim().toUpperCase().min(1),
  subtotal: z.number().int().min(0),
  // shopId toko dalam checkout — wajib cocok untuk voucher toko (M9-B2).
  shopId: z.string().uuid().optional(),
});

// POST /api/v1/promo/validate
promoRouter.post('/validate', requireAuth, validateBody(validateSchema), async (req, res, next) => {
  try {
    const { code, subtotal, shopId } = req.body;
    const promo = await prisma.promoCode.findUnique({
      where: { code },
      include: { shop: { select: { name: true } }, category: { select: { name: true } } },
    });
    if (!promo || !promo.isActive) throw new BadRequestError('Kode promo tidak valid');
    if (promo.shopId && promo.shopId !== shopId) {
      throw new BadRequestError(`Voucher ini khusus belanja di toko ${promo.shop?.name ?? 'tertentu'}`);
    }

    // Voucher kategori (M9-C1): dasar diskon = subtotal item keranjang yang
    // masuk kategori itu, dihitung server. `subtotal` kiriman klien sengaja
    // TIDAK dipakai untuk kasus ini.
    const ctx = await muatKonteksKeranjang(req.user!.sub);
    const basisKat = basisKategori(ctx, promo.categoryId, promo.shopId);
    if (promo.categoryId && basisKat === 0) {
      throw new BadRequestError(
        `Voucher ini hanya untuk produk kategori ${promo.category?.name ?? 'tertentu'}`,
      );
    }
    const basis = basisKat ?? subtotal;

    const now = new Date();
    if (now < promo.validFrom || now > promo.validUntil) {
      throw new BadRequestError('Kode promo sudah tidak berlaku');
    }
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      throw new BadRequestError('Kuota promo sudah habis');
    }
    if (basis < promo.minPurchase) {
      throw new BadRequestError(
        `Minimal belanja Rp ${promo.minPurchase.toLocaleString('id-ID')} untuk pakai promo ini`,
      );
    }

    const discount = computeDiscount(promo, basis);

    return ok(res, {
      code: promo.code,
      discountAmount: discount,
      type: promo.discountType,
      value: promo.discountValue,
    });
  } catch (err) { next(err); }
});
