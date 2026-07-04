import { apiFetch } from './client';
import type { ProductCard } from './products';

export interface WishlistResult {
  items: ProductCard[];
  total: number;
  page: number;
  limit: number;
}

export function getWishlist(token: string, page = 1, limit = 20): Promise<WishlistResult> {
  return apiFetch<WishlistResult>(`/api/v1/users/me/wishlist?page=${page}&limit=${limit}`, { token });
}

export function getWishlistCount(token: string): Promise<{ count: number }> {
  return apiFetch<{ count: number }>('/api/v1/users/me/wishlist/count', { token });
}

export function getWishlistIds(token: string): Promise<string[]> {
  return apiFetch<string[]>('/api/v1/users/me/wishlist/ids', { token });
}

export function addToWishlist(token: string, productId: string) {
  return apiFetch(`/api/v1/users/me/wishlist/${productId}`, { method: 'POST', token });
}

export function removeFromWishlist(token: string, productId: string) {
  return apiFetch(`/api/v1/users/me/wishlist/${productId}`, { method: 'DELETE', token });
}
