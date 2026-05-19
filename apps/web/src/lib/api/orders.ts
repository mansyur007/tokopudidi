import { apiFetch } from './client';
import type { CheckoutInput } from '@tokopudidi/shared';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  paymentMethod: 'COD' | 'TRANSFER_MANUAL' | 'QRIS_MOCK';
  shippingMethod: 'REGULAR' | 'SAME_DAY' | 'PICKUP_SENDIRI';
  createdAt: string;
  shop: { id: string; name: string; slug: string; logoUrl: string | null };
  items: { id: string; productName: string; productImage: string | null; price: number; quantity: number; subtotal: number; variantName: string | null }[];
}

export interface OrderListResult {
  items: OrderListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderDetail extends OrderListItem {
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  promoCode: string | null;
  notes: string | null;
  trackingNumber: string | null;
  buyerAddress: unknown;
  shopAddress: unknown;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  paymentProof: {
    id: string;
    bankName: string;
    accountName: string;
    transferAmount: number;
    proofImageUrl: string;
    uploadedAt: string;
    verifiedAt: string | null;
    rejectedAt: string | null;
    rejectReason: string | null;
  } | null;
  tracking: { status: string; timestamp: string; reached: boolean }[] | null;
}

export interface PaymentInstruction {
  method: string;
  qrCodeUrl?: string;
  bankAccounts?: { bank: string; accountName: string; accountNo: string }[];
  expiresAt: string;
}

export const checkoutOrder = (token: string, body: CheckoutInput) =>
  apiFetch<{ orders: OrderListItem[] }>('/api/v1/orders/checkout', {
    method: 'POST', token, body: JSON.stringify(body),
  });

export const listOrders = (token: string, status?: string, page = 1) =>
  apiFetch<OrderListResult>(
    `/api/v1/orders?status=${encodeURIComponent(status ?? 'ALL')}&page=${page}`,
    { token },
  );

export const getOrder = (token: string, id: string) =>
  apiFetch<OrderDetail>(`/api/v1/orders/${id}`, { token });

export const getPaymentInstruction = (token: string, id: string) =>
  apiFetch<PaymentInstruction>(`/api/v1/orders/${id}/payment-instruction`, { token });

export const payOrderMock = (token: string, id: string) =>
  apiFetch(`/api/v1/orders/${id}/pay`, { method: 'POST', token });

export const uploadPaymentProof = (
  token: string,
  id: string,
  body: { bankName: string; accountName: string; transferAmount: number; proofImageUrl: string },
) =>
  apiFetch(`/api/v1/orders/${id}/upload-proof`, {
    method: 'POST', token, body: JSON.stringify(body),
  });

export const cancelOrder = (token: string, id: string, reason: string) =>
  apiFetch(`/api/v1/orders/${id}/cancel`, {
    method: 'POST', token, body: JSON.stringify({ reason }),
  });

export const completeOrder = (token: string, id: string) =>
  apiFetch(`/api/v1/orders/${id}/complete`, { method: 'POST', token });
