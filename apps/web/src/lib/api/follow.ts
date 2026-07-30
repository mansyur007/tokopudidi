import { apiFetch } from './client';
import type { ShopCard } from './shops';

export interface FollowingResult {
  items: ShopCard[];
  total: number;
  page: number;
  limit: number;
}

export function getFollowedShops(token: string, page = 1, limit = 20): Promise<FollowingResult> {
  return apiFetch<FollowingResult>(`/api/v1/users/me/following?page=${page}&limit=${limit}`, { token });
}

/** shopId yang di-follow — sumber status tombol Follow di seluruh app. */
export function getFollowedShopIds(token: string): Promise<string[]> {
  return apiFetch<string[]>('/api/v1/users/me/following/ids', { token });
}

export function followShop(token: string, slug: string) {
  return apiFetch(`/api/v1/shops/${slug}/follow`, { method: 'POST', token });
}

export function unfollowShop(token: string, slug: string) {
  return apiFetch(`/api/v1/shops/${slug}/follow`, { method: 'DELETE', token });
}
