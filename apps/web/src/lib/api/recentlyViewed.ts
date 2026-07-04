import { apiFetch } from './client';
import type { ProductCard } from './products';

export function getRecentProducts(token?: string, limit = 10): Promise<ProductCard[]> {
  return apiFetch<ProductCard[]>(`/api/v1/users/me/recent-products?limit=${limit}`, { token });
}

export function removeRecentProduct(productId: string, token?: string) {
  return apiFetch(`/api/v1/users/me/recent-products/${productId}`, { method: 'DELETE', token });
}
