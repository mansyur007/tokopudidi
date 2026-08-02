import type { ShopBadge } from '@tokopudidi/shared';
import { apiFetch } from './client';
import type { ProductCard } from './products';

export interface ShopCard {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  city: string;
  ratingAvg: number;
  ratingCount: number;
  totalSold: number;
  badge: ShopBadge | null;
}

// Etalase toko (M11-B1) — hanya yang punya produk tampil yang dikirim API.
export interface ShopShowcaseSummary {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface ShopDetail extends ShopCard {
  description: string | null;
  bannerUrl: string | null;
  province: string | null;
  isOpen: boolean;
  closedReason: string | null;
  joinedAt: string;
  showcases: ShopShowcaseSummary[];
  // M13-A1. Tidak ada `isFollowing` di sini — SSR tidak membawa token buyer,
  // status follow diambil client-side lewat store `follow`.
  followerCount: number;
}

export async function fetchFeaturedShops(): Promise<ShopCard[]> {
  try {
    return await apiFetch<ShopCard[]>('/api/v1/shops/featured');
  } catch {
    return [];
  }
}

export function getShop(slug: string): Promise<ShopDetail> {
  return apiFetch<ShopDetail>(`/api/v1/shops/${slug}`);
}

export function getShopShowcase(
  slug: string,
  showcaseSlug: string,
  params: { page?: number; limit?: number } = {},
): Promise<{
  showcase: { id: string; name: string; slug: string };
  items: ProductCard[];
  total: number;
  page: number;
  limit: number;
}> {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return apiFetch(`/api/v1/shops/${slug}/showcase/${showcaseSlug}${qs ? `?${qs}` : ''}`);
}
