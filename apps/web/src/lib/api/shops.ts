import { apiFetch } from './client';

export interface ShopCard {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  city: string;
  ratingAvg: number;
  ratingCount: number;
  totalSold: number;
}

export interface ShopDetail extends ShopCard {
  description: string | null;
  bannerUrl: string | null;
  province: string | null;
  isOpen: boolean;
  closedReason: string | null;
  joinedAt: string;
  ktpVerified: boolean;
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
