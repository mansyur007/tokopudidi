import { apiFetch } from './client';
import type { ProductCard } from './products';

// Flash sale (M15-C1) — sisi pembeli & panel admin.

export interface FlashSaleItemCard {
  id: string;
  salePrice: number;
  quota: number;
  soldCount: number;
  /** Sisa kuota; 0 = "Habis" — checkout otomatis pakai harga normal. */
  remaining: number;
  /** Kartunya sudah membawa harga flash; tidak perlu dihitung ulang di FE. */
  product: ProductCard;
}

export interface RunningFlashSale {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  items: FlashSaleItemCard[];
}

/** `null` kalau tidak ada event berjalan — itu keadaan normal, bukan error. */
export const getActiveFlashSale = () =>
  apiFetch<RunningFlashSale | null>('/api/v1/flash-sales/active');

// ===== Admin =====

export interface AdminFlashSaleRow {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  _count: { items: number };
}

export interface AdminFlashSaleItem {
  id: string;
  salePrice: number;
  quota: number;
  soldCount: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    stock: number;
    images: { url: string }[];
    shop: { name: string };
  };
  /** Peringatan non-blokir dari server, mis. kuota melebihi stok. */
  warnings?: string[];
}

export interface AdminFlashSaleDetail extends Omit<AdminFlashSaleRow, '_count'> {
  items: AdminFlashSaleItem[];
}

export interface FlashSaleInput {
  name: string;
  startAt: string;
  endAt: string;
  isActive?: boolean;
}

export const listAdminFlashSales = (token: string) =>
  apiFetch<AdminFlashSaleRow[]>('/api/v1/admin/flash-sales', { token });

export const getAdminFlashSale = (token: string, id: string) =>
  apiFetch<AdminFlashSaleDetail>(`/api/v1/admin/flash-sales/${id}`, { token });

export const createAdminFlashSale = (token: string, body: FlashSaleInput) =>
  apiFetch<AdminFlashSaleRow>('/api/v1/admin/flash-sales', {
    method: 'POST', token, body: JSON.stringify(body),
  });

export const updateAdminFlashSale = (token: string, id: string, body: Partial<FlashSaleInput>) =>
  apiFetch<AdminFlashSaleRow>(`/api/v1/admin/flash-sales/${id}`, {
    method: 'PUT', token, body: JSON.stringify(body),
  });

export const deleteAdminFlashSale = (token: string, id: string) =>
  apiFetch(`/api/v1/admin/flash-sales/${id}`, { method: 'DELETE', token });

export const addAdminFlashSaleItem = (
  token: string,
  id: string,
  body: { productId: string; salePrice: number; quota: number },
) =>
  apiFetch<AdminFlashSaleItem>(`/api/v1/admin/flash-sales/${id}/items`, {
    method: 'POST', token, body: JSON.stringify(body),
  });

export const updateAdminFlashSaleItem = (
  token: string,
  id: string,
  itemId: string,
  body: { salePrice?: number; quota?: number },
) =>
  apiFetch<AdminFlashSaleItem>(`/api/v1/admin/flash-sales/${id}/items/${itemId}`, {
    method: 'PUT', token, body: JSON.stringify(body),
  });

export const deleteAdminFlashSaleItem = (token: string, id: string, itemId: string) =>
  apiFetch(`/api/v1/admin/flash-sales/${id}/items/${itemId}`, { method: 'DELETE', token });
