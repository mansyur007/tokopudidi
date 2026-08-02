import { Prisma } from '@tokopudidi/database';
import { prisma } from '@tokopudidi/database';

/**
 * Flash sale (M15-C1) — resolusi harga & kuota.
 *
 * File ini sengaja tidak mengimpor apa pun dari modul lain: `product.service`
 * memakainya untuk menempelkan harga flash ke kartu produk, jadi kalau file ini
 * balik mengimpor `product.service` lingkaran importnya tertutup. Yang butuh
 * keduanya (`flashSale.read.ts`) berdiri di atas keduanya.
 *
 * Semua keputusan "slot ini masih berlaku" hidup di sini; yang memutuskan
 * "harga mana yang menang" tetap `resolveUnitPrice` di packages/shared — helper
 * itu harus tetap pure supaya FE bisa memakainya juga.
 */

/** Filter Prisma untuk event yang benar-benar sedang berjalan pada `now`. */
export function runningWhere(now: Date): Prisma.FlashSaleWhereInput {
  return { isActive: true, startAt: { lte: now }, endAt: { gt: now } };
}

/** Harga flash yang berlaku untuk sebuah produk, sudah dipastikan berkuota. */
export interface FlashPriceHit {
  flashSaleItemId: string;
  salePrice: number;
  /** Sisa kuota saat dibaca — angka tampilan, BUKAN jaminan (lihat `reserveFlashQuota`). */
  remaining: number;
  endAt: Date;
}

/**
 * Harga flash yang sedang berlaku untuk sekumpulan produk.
 *
 * Satu query untuk berapa pun jumlah produk — sengaja begitu supaya halaman
 * listing tidak berubah jadi N+1 hanya karena flash sale ada. Produk yang
 * kuotanya sudah habis tidak dikembalikan sama sekali: bagi pemanggil, "habis"
 * dan "tidak ikut event" sama-sama berarti harga normal.
 */
export async function resolveFlashPrices(
  productIds: string[],
  now: Date = new Date(),
): Promise<Map<string, FlashPriceHit>> {
  const hasil = new Map<string, FlashPriceHit>();
  if (productIds.length === 0) return hasil;

  const rows = await prisma.flashSaleItem.findMany({
    where: { productId: { in: productIds }, flashSale: runningWhere(now) },
    select: {
      id: true, productId: true, salePrice: true, quota: true, soldCount: true,
      flashSale: { select: { endAt: true } },
    },
    // Kalau sebuah produk toh masuk dua event yang berjalan bersamaan (validasi
    // admin menolaknya, tapi data lama bisa saja begitu), yang dipakai adalah
    // yang paling murah — bukan yang kebetulan lebih dulu dibaca.
    orderBy: { salePrice: 'asc' },
  });

  for (const r of rows) {
    if (hasil.has(r.productId)) continue;
    const remaining = r.quota - r.soldCount;
    if (remaining <= 0) continue;
    hasil.set(r.productId, {
      flashSaleItemId: r.id,
      salePrice: r.salePrice,
      remaining,
      endAt: r.flashSale.endAt,
    });
  }
  return hasil;
}

/**
 * Potong kuota satu slot flash secara atomik. Harus dipanggil di dalam
 * transaksi checkout. `true` = slot didapat, `false` = kuota habis.
 *
 * Syaratnya dievaluasi oleh Postgres di baris yang sama dengan penulisannya,
 * jadi sisa kuota tidak pernah dibaca lalu ditulis dalam dua langkah terpisah:
 * dua checkout paralel yang memperebutkan unit terakhir tidak bisa dua-duanya
 * menang, dan yang kalah membayar harga normal tanpa checkout-nya gagal.
 *
 * SQL mentah, bukan `updateMany`, karena syaratnya membandingkan dua kolom
 * (`soldCount + qty <= quota`) dan Prisma tidak bisa menyusun itu. Alternatif
 * yang sempat dipertimbangkan — membaca `quota` lebih dulu lalu memakai
 * `soldCount: { lte: quota - qty }` — menyisakan celah kecil: kalau admin
 * menurunkan kuota di antara baca dan tulis, penjagaannya memakai angka basi
 * dan slot bisa terjual melewati kuota barunya.
 */
export async function reserveFlashQuota(
  tx: Prisma.TransactionClient,
  flashSaleItemId: string,
  qty: number,
): Promise<boolean> {
  const terpengaruh = await tx.$executeRaw`
    UPDATE "FlashSaleItem"
       SET "soldCount" = "soldCount" + ${qty}
     WHERE "id" = ${flashSaleItemId}
       AND "soldCount" + ${qty} <= "quota"
  `;
  return terpengaruh > 0;
}
