import { apiFetch } from './client';
import type { AddressInput } from '@tokopudidi/shared';

export interface Address {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  postalCode: string;
  fullAddress: string;
  isDefault: boolean;
}

export const listAddresses = (token: string) =>
  apiFetch<Address[]>('/api/v1/users/me/addresses', { token });

export const createAddress = (token: string, body: AddressInput) =>
  apiFetch<Address>('/api/v1/users/me/addresses', {
    method: 'POST', token, body: JSON.stringify(body),
  });

export const updateAddress = (token: string, id: string, body: Partial<AddressInput>) =>
  apiFetch<Address>(`/api/v1/users/me/addresses/${id}`, {
    method: 'PATCH', token, body: JSON.stringify(body),
  });

export const deleteAddress = (token: string, id: string) =>
  apiFetch(`/api/v1/users/me/addresses/${id}`, { method: 'DELETE', token });
