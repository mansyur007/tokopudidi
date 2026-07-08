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
