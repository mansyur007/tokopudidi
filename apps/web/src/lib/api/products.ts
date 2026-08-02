import type { ShopBadge } from '@tokopudidi/shared';
import { apiFetch } from './client';

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  price: number;                 // harga efektif (sudah termasuk sale M9-B3)
  originalPrice: number | null;  // harga coret — hanya saat sale aktif
  discountPct: number | null;    // persen diskon — hanya saat sale aktif
  saleEndAt: string | null;      // untuk countdown
  imageUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  // `badge` (M14-B1) dikirim sudah jadi oleh API — FE tidak menghitung ulang
  // kriterianya, dan bahan mentahnya (`ktpVerified`/`isOfficialStore`) memang
  // tidak lagi ikut dikirim ke pembeli.
  shop: { id: string; name: string; slug: string; city: string; badge: ShopBadge | null };
}

export interface ProductDetail extends Omit<ProductCard, 'originalPrice' | 'discountPct'> {
  // Detail endpoint kirim raw fields — FE hitung sendiri via helper shared (getEffectivePrice dkk).
  salePrice: number | null;
  saleStartAt: string | null;
  description: string;
  stock: number;
  weight: number;
  minOrderQty: number;
  condition: 'NEW' | 'USED';
  codAvailable: boolean;
  freeShippingEligible: boolean;
  viewCount: number;
  images: { id: string; url: string; order: number }[];
  // Variant multi-axis (M11-A8). `optionValues` sejajar urutan `options`;
  // kosong untuk produk lama yang belum di-backfill — FE jatuh ke mode 1 sumbu
  // memakai `name`.
  options: { id: string; name: string; order: number; values: { id: string; value: string; order: number }[] }[];
  variants: {
    id: string; name: string; priceModifier: number; stock: number;
    imageUrl: string | null;
    optionValues: string[];
    optionValueIds: string[];
  }[];
  // Harga grosir (M13-B1), terurut menaik menurut minQty. Dikirim mentah —
  // harga per qty dihitung FE lewat `getUnitPrice`, helper yang sama dengan
  // yang dipakai server saat menghitung keranjang & checkout.
  wholesaleTiers: { minQty: number; price: number }[];
  category: { id: string; name: string; slug: string };
  shop: ProductCard['shop'] & {
    logoUrl: string | null;
    ratingAvg: number;
    ratingCount: number;
    totalSold: number;
    isOpen: boolean;
  };
}

export interface ProductListResult {
  items: ProductCard[];
  total: number;
  page: number;
  limit: number;
}

export type ProductListParams = Partial<{
  q: string;
  categoryId: string;
  categorySlug: string;
  shopId: string;
  province: string;
  /** Kota, comma-separated. Semantik OR antar kota. */
  cities: string;
  minPrice: number;
  maxPrice: number;
  minRating: number;
  condition: 'NEW' | 'USED';
  officialStoreOnly: boolean;
  freeShipping: boolean;
  cod: boolean;
  sort: 'relevance' | 'bestseller' | 'cheapest' | 'expensive' | 'newest' | 'rating';
  page: number;
  limit: number;
}>;

export interface CityOption {
  city: string;
  count: number;
}

function toQuery(p: ProductListParams): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function listProducts(params: ProductListParams = {}): Promise<ProductListResult> {
  return apiFetch<ProductListResult>(`/api/v1/products${toQuery(params)}`);
}

/** Opsi filter lokasi — kota yang punya produk aktif + jumlahnya. */
export function listProductCities(): Promise<CityOption[]> {
  return apiFetch<CityOption[]>('/api/v1/products/cities');
}

export function getProduct(slug: string): Promise<ProductDetail> {
  return apiFetch<ProductDetail>(`/api/v1/products/${slug}`);
}

export function getRelated(productId: string): Promise<ProductCard[]> {
  return apiFetch<ProductCard[]>(`/api/v1/products/${productId}/related`);
}

export function getForYou(params: { token?: string; limit?: number } = {}): Promise<ProductCard[]> {
  const { token, limit = 30 } = params;
  return apiFetch<ProductCard[]>(`/api/v1/products/for-you?limit=${limit}`, { token });
}

export function trackView(productId: string, token?: string): Promise<unknown> {
  return apiFetch(`/api/v1/products/${productId}/view`, { method: 'POST', token });
}
