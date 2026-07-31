// Helper harga efektif produk (M9-B3 sale price).
// Prioritas harga (rencana lintas-milestone): Flash Sale (M15-C1) > Sale Price (M9-B3)
// > Harga Grosir (M13-B1) > harga normal. Yang mengerjakan berikutnya extend helper ini.

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

/**
 * Harga satuan final untuk kuantitas tertentu — **satu-satunya** fungsi yang
 * boleh dipakai menghitung harga per item di cart, checkout, dan BuyBox.
 *
 * Kontraknya `min`, bukan "tier menang": tier hanya dipakai kalau memang lebih
 * murah dari harga efektif saat itu. Tanpa itu, produk yang sedang diskon
 * (M9-B3) justru jadi lebih mahal saat dibeli banyak — persis kebalikan dari
 * yang dijanjikan kata "grosir".
 *
 * `priceModifier` varian ditambahkan SETELAH fungsi ini oleh pemanggil,
 * konsisten dengan pola yang sudah ada di cart & order service.
 */
export function getUnitPrice(
  p: WholesalePriceFields,
  qty: number = 1,
  now: Date = new Date(),
): number {
  const efektif = getEffectivePrice(p, now);
  const tier = getWholesaleTierPrice(p.wholesaleTiers, qty);
  return tier == null ? efektif : Math.min(efektif, tier);
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
