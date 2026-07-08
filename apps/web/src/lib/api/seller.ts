import { apiFetch } from './client';
import type {
  UpgradeToSellerInput,
  ProductCreateInput,
} from '@tokopudidi/shared';

// ===== Shop =====
export interface SellerShop {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  city: string;
  province: string | null;
  isOpen: boolean;
  closedReason: string | null;
  ratingAvg: number;
  ratingCount: number;
  totalSold: number;
  ktpVerified: boolean;
  bankName: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  autoReplyText: string | null;
  balance: number;
  pendingBalance: number;
}

export const upgradeToSeller = (token: string, body: UpgradeToSellerInput) =>
  apiFetch<{ id: string; slug: string }>('/api/v1/users/me/upgrade-to-seller', {
    method: 'POST', token, body: JSON.stringify(body),
  });

export const getSellerShop = (token: string) =>
  apiFetch<SellerShop>('/api/v1/seller/shop', { token });

export const updateSellerShop = (token: string, body: Partial<SellerShop>) =>
  apiFetch<SellerShop>('/api/v1/seller/shop', {
    method: 'PATCH', token, body: JSON.stringify(body),
  });

export const toggleShopOpen = (token: string, reason?: string) =>
  apiFetch<SellerShop>('/api/v1/seller/shop/toggle-open', {
    method: 'POST', token, body: JSON.stringify({ reason }),
  });

// ===== Dashboard =====
export interface SellerDashboard {
  todayOrders: number;
  weekRevenue: number;
  activeProducts: number;
  shop: { ratingAvg: number; ratingCount: number; totalSold: number; balance: number; pendingBalance: number; ktpVerified: boolean; isOpen: boolean };
  recentOrders: { id: string; orderNumber: string; status: string; total: number; createdAt: string; buyer: { fullName: string } }[];
  chart: { date: string; orderCount: number; revenue: number }[];
}

export const getSellerDashboard = (token: string) =>
  apiFetch<SellerDashboard>('/api/v1/seller/dashboard', { token });

// ===== Products =====
export interface SellerProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  isActive: boolean;
  soldCount: number;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  category: { name: string; slug: string };
  images: { id: string; url: string; order: number }[];
}

export const listSellerProducts = (token: string, params: { q?: string; status?: string; page?: number } = {}) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, String(v));
  return apiFetch<{ items: SellerProductRow[]; total: number; page: number; limit: number }>(
    `/api/v1/seller/products?${sp.toString()}`,
    { token },
  );
};

export interface SellerProductDetail extends SellerProductRow {
  description: string;
  weight: number;
  minOrderQty: number;
  condition: 'NEW' | 'USED';
  categoryId: string;
  salePrice: number | null;
  saleStartAt: string | null;
  saleEndAt: string | null;
  variants: { id: string; name: string; priceModifier: number; stock: number }[];
}

export const getSellerProduct = (token: string, id: string) =>
  apiFetch<SellerProductDetail>(`/api/v1/seller/products/${id}`, { token });

export const createSellerProduct = (token: string, body: ProductCreateInput) =>
  apiFetch<{ id: string; slug: string }>('/api/v1/seller/products', {
    method: 'POST', token, body: JSON.stringify(body),
  });

export const updateSellerProduct = (token: string, id: string, body: Partial<ProductCreateInput>) =>
  apiFetch(`/api/v1/seller/products/${id}`, {
    method: 'PATCH', token, body: JSON.stringify(body),
  });

export const deleteSellerProduct = (token: string, id: string) =>
  apiFetch(`/api/v1/seller/products/${id}`, { method: 'DELETE', token });

export const duplicateSellerProduct = (token: string, id: string) =>
  apiFetch(`/api/v1/seller/products/${id}/duplicate`, { method: 'POST', token });

// ===== Orders =====
export interface SellerOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  paymentMethod: string;
  shippingMethod: string;
  trackingNumber: string | null;
  createdAt: string;
  notes: string | null;
  buyer: { id: string; fullName: string; phone: string };
  items: { id: string; productName: string; productImage: string | null; price: number; quantity: number; subtotal: number; variantName: string | null }[];
}

export interface SellerOrderDetail extends SellerOrderRow {
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  buyerAddress: unknown;
  courierName: string | null;
  paidAt: string | null;
  processedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  paymentProof: { id: string; bankName: string; accountName: string; transferAmount: number; proofImageUrl: string; uploadedAt: string; verifiedAt: string | null; rejectedAt: string | null; rejectReason: string | null } | null;
}

export const listSellerOrders = (token: string, status = 'ALL', page = 1) =>
  apiFetch<{ items: SellerOrderRow[]; total: number; page: number; limit: number }>(
    `/api/v1/seller/orders?status=${status}&page=${page}`,
    { token },
  );

export const getSellerOrder = (token: string, id: string) =>
  apiFetch<SellerOrderDetail>(`/api/v1/seller/orders/${id}`, { token });

export const processOrder = (token: string, id: string) =>
  apiFetch(`/api/v1/seller/orders/${id}/process`, { method: 'POST', token });

export const shipOrder = (token: string, id: string, trackingNumber: string, courierName: string) =>
  apiFetch(`/api/v1/seller/orders/${id}/ship`, {
    method: 'POST', token, body: JSON.stringify({ trackingNumber, courierName }),
  });

export const rejectOrder = (token: string, id: string, reason: string) =>
  apiFetch(`/api/v1/seller/orders/${id}/reject`, {
    method: 'POST', token, body: JSON.stringify({ reason }),
  });

export const markDelivered = (token: string, id: string) =>
  apiFetch(`/api/v1/seller/orders/${id}/mark-delivered`, { method: 'POST', token });

// ===== Payments =====
export interface PaymentProofRow {
  id: string;
  bankName: string;
  accountName: string;
  transferAmount: number;
  proofImageUrl: string;
  uploadedAt: string;
  verifiedAt: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  order: {
    id: string; orderNumber: string; total: number; status: string;
    buyer: { fullName: string; phone: string };
  };
}

export const listSellerPayments = (token: string, status = 'PENDING') =>
  apiFetch<PaymentProofRow[]>(`/api/v1/seller/payments?status=${status}`, { token });

export const verifyPayment = (token: string, proofId: string, approved: boolean, rejectReason?: string) =>
  apiFetch(`/api/v1/seller/payments/${proofId}/verify`, {
    method: 'POST', token,
    body: JSON.stringify({ approved, rejectReason }),
  });

// ===== Finance =====
export interface SellerFinance {
  shop: {
    balance: number;
    pendingBalance: number;
    bankName: string | null;
    bankAccountNo: string | null;
    bankAccountName: string | null;
  } | null;
  withdrawals: {
    id: string; amount: number; status: string; bankName: string;
    bankAccountNo: string; requestedAt: string; processedAt: string | null;
  }[];
}

export const getSellerFinance = (token: string) =>
  apiFetch<SellerFinance>('/api/v1/seller/finance', { token });

export const requestWithdraw = (token: string, amount: number) =>
  apiFetch('/api/v1/seller/finance/withdraw', {
    method: 'POST', token, body: JSON.stringify({ amount }),
  });

// ===== Categories (for product form) =====
export interface CategoryFlat { id: string; name: string; slug: string }

export const listCategoriesFlat = async (): Promise<CategoryFlat[]> => {
  const cats = await apiFetch<{ id: string; name: string; slug: string; children?: { id: string; name: string; slug: string }[] }[]>('/api/v1/categories');
  const flat: CategoryFlat[] = [];
  for (const c of cats) {
    flat.push({ id: c.id, name: c.name, slug: c.slug });
    for (const child of c.children ?? []) {
      flat.push({ id: child.id, name: `${c.name} › ${child.name}`, slug: child.slug });
    }
  }
  return flat;
};

// ===== Chat Templates (M8-B6) =====
export interface ChatTemplateRow {
  id: string;
  label: string;
  body: string;
  order: number;
  createdAt: string;
}

export const listChatTemplates = (token: string) =>
  apiFetch<ChatTemplateRow[]>('/api/v1/seller/chat-templates', { token });

export const createChatTemplate = (token: string, body: { label: string; body: string; order?: number }) =>
  apiFetch<ChatTemplateRow>('/api/v1/seller/chat-templates', {
    method: 'POST', token, body: JSON.stringify(body),
  });

export const updateChatTemplate = (token: string, id: string, body: Partial<{ label: string; body: string; order: number }>) =>
  apiFetch<ChatTemplateRow>(`/api/v1/seller/chat-templates/${id}`, {
    method: 'PUT', token, body: JSON.stringify(body),
  });

export const deleteChatTemplate = (token: string, id: string) =>
  apiFetch(`/api/v1/seller/chat-templates/${id}`, { method: 'DELETE', token });

// ===== Voucher Toko (M9-B2) =====
export interface SellerVoucherRow {
  id: string;
  code: string;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  minPurchase: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
}

export interface VoucherFormInput {
  code: string;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  minPurchase: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  validFrom: string;
  validUntil: string;
}

export const listSellerVouchers = (token: string) =>
  apiFetch<SellerVoucherRow[]>('/api/v1/seller/voucher', { token });

export const createSellerVoucher = (token: string, body: VoucherFormInput) =>
  apiFetch<SellerVoucherRow>('/api/v1/seller/voucher', {
    method: 'POST', token, body: JSON.stringify(body),
  });

export const updateSellerVoucher = (token: string, id: string, body: Partial<VoucherFormInput> & { isActive?: boolean }) =>
  apiFetch<SellerVoucherRow>(`/api/v1/seller/voucher/${id}`, {
    method: 'PUT', token, body: JSON.stringify(body),
  });

export const deleteSellerVoucher = (token: string, id: string) =>
  apiFetch(`/api/v1/seller/voucher/${id}`, { method: 'DELETE', token });
