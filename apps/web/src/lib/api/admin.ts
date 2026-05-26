import { apiFetch } from './client';
import type { BannerCreateInput, CategoryCreateInput } from '@tokopudidi/shared';

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '' && v !== null) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export interface Paged<T> { items: T[]; total: number; page: number; limit: number }

// ===== Dashboard =====
export interface AdminDashboard {
  totalUsers: number;
  totalSellers: number;
  totalShops: number;
  shopsPendingKtp: number;
  activeProducts: number;
  todayOrders: number;
  todayGmv: number;
  pendingRefunds: number;
  pendingPayments: number;
  reportedReviews: number;
  chart: { date: string; orderCount: number; gmv: number }[];
}

export const getAdminDashboard = (token: string) =>
  apiFetch<AdminDashboard>('/api/v1/admin/dashboard', { token });

// ===== Users =====
export interface AdminUserRow {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  isSuspended: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  shop: { id: string; name: string; slug: string } | null;
}

export const listAdminUsers = (token: string, params: { q?: string; role?: string; status?: string; page?: number } = {}) =>
  apiFetch<Paged<AdminUserRow>>(`/api/v1/admin/users${qs(params)}`, { token });

export const suspendUser = (token: string, id: string, reason: string) =>
  apiFetch(`/api/v1/admin/users/${id}/suspend`, { method: 'POST', token, body: JSON.stringify({ reason }) });

export const unsuspendUser = (token: string, id: string) =>
  apiFetch(`/api/v1/admin/users/${id}/unsuspend`, { method: 'POST', token });

// ===== Shops =====
export interface AdminShopRow {
  id: string;
  name: string;
  slug: string;
  city: string;
  province: string | null;
  ktpVerified: boolean;
  isOpen: boolean;
  ratingAvg: number;
  ratingCount: number;
  totalSold: number;
  balance: number;
  joinedAt: string;
  deletedAt: string | null;
  owner: { id: string; fullName: string; phone: string };
  _count: { products: number; orders: number };
}

export interface AdminShopDetail extends Omit<AdminShopRow, '_count'> {
  description: string | null;
  ktpUrl: string | null;
  bankName: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  pendingBalance: number;
  owner: { id: string; fullName: string; phone: string; email: string | null; createdAt: string };
  _count: { products: number; orders: number; withdrawals: number };
}

export const listAdminShops = (token: string, params: { q?: string; status?: string; page?: number } = {}) =>
  apiFetch<Paged<AdminShopRow>>(`/api/v1/admin/shops${qs(params)}`, { token });

export const getAdminShop = (token: string, id: string) =>
  apiFetch<AdminShopDetail>(`/api/v1/admin/shops/${id}`, { token });

export const verifyShopKtp = (token: string, id: string) =>
  apiFetch(`/api/v1/admin/shops/${id}/verify-ktp`, { method: 'POST', token });

export const suspendShop = (token: string, id: string, reason: string) =>
  apiFetch(`/api/v1/admin/shops/${id}/suspend`, { method: 'POST', token, body: JSON.stringify({ reason }) });

export const unsuspendShop = (token: string, id: string) =>
  apiFetch(`/api/v1/admin/shops/${id}/unsuspend`, { method: 'POST', token });

// ===== Products =====
export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  isActive: boolean;
  soldCount: number;
  ratingAvg: number;
  createdAt: string;
  images: { url: string }[];
  shop: { id: string; name: string; slug: string };
  category: { name: string };
}

export const listAdminProducts = (token: string, params: { q?: string; status?: string; page?: number } = {}) =>
  apiFetch<Paged<AdminProductRow>>(`/api/v1/admin/products${qs(params)}`, { token });

export const takedownProduct = (token: string, id: string, reason: string) =>
  apiFetch(`/api/v1/admin/products/${id}/takedown`, { method: 'POST', token, body: JSON.stringify({ reason }) });

export const restoreProduct = (token: string, id: string) =>
  apiFetch(`/api/v1/admin/products/${id}/restore`, { method: 'POST', token });

// ===== Refunds =====
export interface AdminRefundRow {
  id: string;
  reason: string;
  evidenceImages: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  requestedBy: { id: string; fullName: string; phone: string };
  order: {
    id: string; orderNumber: string; total: number; status: string; createdAt: string;
    shop: { id: string; name: string };
    items: { productName: string; quantity: number; price: number }[];
  };
}

export const listAdminRefunds = (token: string, params: { status?: string; page?: number } = {}) =>
  apiFetch<Paged<AdminRefundRow>>(`/api/v1/admin/refunds${qs(params)}`, { token });

export const resolveRefund = (token: string, id: string, approved: boolean, adminNote?: string) =>
  apiFetch(`/api/v1/admin/refunds/${id}/resolve`, {
    method: 'POST', token, body: JSON.stringify({ approved, adminNote }),
  });

// ===== Banners =====
export interface AdminBanner {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  order: number;
  isActive: boolean;
  placement: 'HOME_TOP' | 'HOME_MIDDLE' | 'CATEGORY_PAGE';
  validFrom: string | null;
  validUntil: string | null;
}

export const listAdminBanners = (token: string) =>
  apiFetch<AdminBanner[]>('/api/v1/admin/banners', { token });

export const createBanner = (token: string, body: BannerCreateInput) =>
  apiFetch<AdminBanner>('/api/v1/admin/banners', { method: 'POST', token, body: JSON.stringify(body) });

export const updateBanner = (token: string, id: string, body: Partial<BannerCreateInput>) =>
  apiFetch<AdminBanner>(`/api/v1/admin/banners/${id}`, { method: 'PATCH', token, body: JSON.stringify(body) });

export const deleteBanner = (token: string, id: string) =>
  apiFetch(`/api/v1/admin/banners/${id}`, { method: 'DELETE', token });

// ===== Categories =====
export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  iconUrl: string | null;
  order: number;
  isActive: boolean;
  _count: { products: number; children: number };
}

export const listAdminCategories = (token: string) =>
  apiFetch<AdminCategory[]>('/api/v1/admin/categories', { token });

export const createCategory = (token: string, body: CategoryCreateInput) =>
  apiFetch<AdminCategory>('/api/v1/admin/categories', { method: 'POST', token, body: JSON.stringify(body) });

export const updateCategory = (token: string, id: string, body: Partial<CategoryCreateInput>) =>
  apiFetch<AdminCategory>(`/api/v1/admin/categories/${id}`, { method: 'PATCH', token, body: JSON.stringify(body) });

export const deleteCategory = (token: string, id: string) =>
  apiFetch(`/api/v1/admin/categories/${id}`, { method: 'DELETE', token });
