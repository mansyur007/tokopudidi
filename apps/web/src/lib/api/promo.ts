import { apiFetch } from './client';

export interface PromoApplied {
  code: string;
  discountAmount: number;
  type: 'FIXED' | 'PERCENTAGE';
  value: number;
}

export const validatePromo = (token: string, code: string, subtotal: number) =>
  apiFetch<PromoApplied>('/api/v1/promo/validate', {
    method: 'POST', token, body: JSON.stringify({ code, subtotal }),
  });

// ===== Voucher Picker (M9-A4) =====
export interface VoucherInfo {
  code: string;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  minPurchase: number;
  maxDiscount: number | null;
  validUntil: string;
}

export interface AvailableVouchers {
  eligible: (VoucherInfo & { discountAmount: number })[];
  ineligible: { promo: VoucherInfo; reason: string }[];
}

export const listAvailableVouchers = (token: string, subtotal: number, shopId?: string) =>
  apiFetch<AvailableVouchers>(
    `/api/v1/promo/available?subtotal=${subtotal}${shopId ? `&shopId=${shopId}` : ''}`,
    { token },
  );
