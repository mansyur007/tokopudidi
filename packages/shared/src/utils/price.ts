// Helper harga efektif produk (M9-B3 sale price).
//
// Prioritas harga (lengkap sejak M15-C1): Flash Sale (M15-C1) > Sale Price
// (M9-B3) > Harga Grosir (M13-B1) > harga normal.
//
// Prioritas itu menentukan siapa yang MENANG SAAT SERI — bukan izin menaikkan
// harga. Yang dibayar pembeli selalu kandidat termurah (lihat `resolveUnitPrice`).
// Aturan itu dipertahankan dari M13-B1 dengan alasan yang sama: promo yang
// membuat harga justru naik adalah kebalikan dari yang dijanjikan namanya.

export interface SalePriceFields {
  price: number;
  salePrice?: number | null;
  saleStartAt?: Date | string | null;
  saleEndAt?: Date | string | null;
}

// Sale aktif kalau salePrice terisi, lebih murah dari harga normal, dan now dalam periode.
export function isSaleActive(p: SalePriceFields, now: Date = new Date()): boolean {
  if (p.salePrice == null || p.salePrice >= p.price) return false;
  if (p.saleStartAt && now < new Date(p.saleStartAt)) return false;
  if (p.saleEndAt && now > new Date(p.saleEndAt)) return false;
  return true;
}

// Harga efektif saat ini — fallback otomatis ke harga normal di luar periode.
export function getEffectivePrice(p: SalePriceFields, now: Date = new Date()): number {
  return isSaleActive(p, now) ? p.salePrice! : p.price;
}

// Persen diskon (dibulatkan) — null kalau sale tidak aktif.
export function getDiscountPct(p: SalePriceFields, now: Date = new Date()): number | null {
  if (!isSaleActive(p, now)) return null;
  return Math.round(((p.price - p.salePrice!) / p.price) * 100);
}

// Sisa waktu sale dalam milidetik — null kalau tidak aktif / tanpa batas akhir.
export function getSaleRemainingMs(p: SalePriceFields, now: Date = new Date()): number | null {
  if (!isSaleActive(p, now) || !p.saleEndAt) return null;
  return new Date(p.saleEndAt).getTime() - now.getTime();
}

// ===== Harga grosir bertingkat (M13-B1) =====

export interface WholesaleTier {
  minQty: number;
  price: number;
}

export interface WholesalePriceFields extends SalePriceFields {
  wholesaleTiers?: WholesaleTier[] | null;
}

/**
 * Harga tier yang berlaku untuk kuantitas tertentu — `null` kalau qty belum
 * mencapai ambang tier mana pun.
 *
 * Tidak mengandalkan urutan array masukan: yang dipilih adalah tier dengan
 * `minQty` TERTINGGI yang masih <= qty. Validasi memang mewajibkan tier
 * terurut, tapi helper ini juga dipakai atas data lama/DB yang urutannya tidak
 * dijamin, dan salah pilih tier di sini berarti salah menagih pembeli.
 */
export function getWholesaleTierPrice(
  tiers: WholesaleTier[] | null | undefined,
  qty: number,
): number | null {
  if (!tiers?.length) return null;
  let terpilih: WholesaleTier | null = null;
  for (const t of tiers) {
    if (qty < t.minQty) continue;
    if (!terpilih || t.minQty > terpilih.minQty) terpilih = t;
  }
  return terpilih ? terpilih.price : null;
}

// ===== Flash sale (M15-C1) =====

/** Dari mana harga satuan yang berlaku itu berasal. */
export type PriceSource = 'FLASH' | 'SALE' | 'WHOLESALE' | 'NORMAL';

export interface FlashPriceFields extends WholesalePriceFields {
  /**
   * Harga slot flash sale yang SUDAH diresolusi pemanggil: event-nya berjalan
   * dan kuotanya masih ada. Helper ini pure dan tidak bisa menanyakannya ke DB,
   * jadi keputusan "flash ini masih berlaku" milik API (lihat
   * `flashSale.service.ts`), sedangkan keputusan "harga mana yang menang" milik
   * fungsi ini — supaya cuma ada satu tempat yang tahu urutannya.
   */
  flashPrice?: number | null;
}

/**
 * Harga satuan final untuk kuantitas tertentu, beserta asalnya.
 *
 * Kontraknya `min`, bukan "yang prioritasnya tertinggi menang": setiap kandidat
 * (flash, sale, tier grosir) hanya dipakai kalau memang paling murah. Prioritas
 * baru berperan ketika dua kandidat menghasilkan angka yang sama persis —
 * di situ yang lebih tinggi prioritasnya yang dilaporkan, karena itulah promo
 * yang sedang diiklankan ke pembeli.
 *
 * `source` bukan hiasan: checkout memakainya untuk memutuskan kapan kuota flash
 * benar-benar dipotong. Kalau tier grosir ternyata lebih murah dari harga flash,
 * pembeli membayar harga tier dan slot flash-nya TIDAK ikut terbakar.
 */
export function resolveUnitPrice(
  p: FlashPriceFields,
  qty: number = 1,
  now: Date = new Date(),
): { price: number; source: PriceSource } {
  const efektif = getEffectivePrice(p, now);
  const tier = getWholesaleTierPrice(p.wholesaleTiers, qty);

  // Urutan array = urutan prioritas saat harganya seri.
  const kandidat: { price: number; source: PriceSource }[] = [];
  if (p.flashPrice != null) kandidat.push({ price: p.flashPrice, source: 'FLASH' });
  kandidat.push({ price: efektif, source: isSaleActive(p, now) ? 'SALE' : 'NORMAL' });
  if (tier != null) kandidat.push({ price: tier, source: 'WHOLESALE' });

  let menang = kandidat[0];
  for (const k of kandidat) {
    if (k.price < menang.price) menang = k;
  }
  return menang;
}

/**
 * Harga satuan final untuk kuantitas tertentu — **satu-satunya** fungsi yang
 * boleh dipakai menghitung harga per item di cart, checkout, dan BuyBox.
 *
 * `priceModifier` varian ditambahkan SETELAH fungsi ini oleh pemanggil,
 * konsisten dengan pola yang sudah ada di cart & order service.
 */
export function getUnitPrice(
  p: FlashPriceFields,
  qty: number = 1,
  now: Date = new Date(),
): number {
  return resolveUnitPrice(p, qty, now).price;
}

/**
 * Ambang kuantitas berikutnya yang harganya lebih murah dari harga sekarang —
 * untuk petunjuk "beli N lagi, hemat ...". `null` kalau sudah di tier teratas
 * atau tier berikutnya tidak benar-benar lebih murah.
 */
export function getNextWholesaleTier(
  p: WholesalePriceFields,
  qty: number,
  now: Date = new Date(),
): WholesaleTier | null {
  if (!p.wholesaleTiers?.length) return null;
  const sekarang = getUnitPrice(p, qty, now);
  const berikut = p.wholesaleTiers
    .filter((t) => t.minQty > qty && t.price < sekarang)
    .sort((a, b) => a.minQty - b.minQty);
  return berikut[0] ?? null;
}
