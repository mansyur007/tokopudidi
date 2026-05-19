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
