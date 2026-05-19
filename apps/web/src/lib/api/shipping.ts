import { apiFetch } from './client';

export const getShippingQuote = (token: string, body: {
  province: string;
  weightGr: number;
  method: 'REGULAR' | 'SAME_DAY' | 'PICKUP_SENDIRI';
}) =>
  apiFetch<{ cost: number; method: string; codAvailable: boolean }>(
    '/api/v1/shipping/quote',
    { method: 'POST', token, body: JSON.stringify(body) },
  );

export const getShippingOptions = (token: string, province: string) =>
  apiFetch<{ sameDayAvailable: boolean; codAvailable: boolean }>(
    `/api/v1/shipping/options?province=${encodeURIComponent(province)}`,
    { token },
  );
