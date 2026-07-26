import { apiFetch } from './client';
import type {
  ComplaintTypeValue,
  ComplaintResolutionValue,
  ComplaintStatusValue,
  CreateComplaintInput,
} from '@tokopudidi/shared';

export interface Complaint {
  id: string;
  type: ComplaintTypeValue;
  resolutionType: ComplaintResolutionValue;
  status: ComplaintStatusValue;
  description: string;
  evidenceUrls: string[];
  sellerResponse: string | null;
  adminDecision: string | null;
  createdAt: string;
  respondedAt: string | null;
  escalatedAt: string | null;
  resolvedAt: string | null;
  orderItem: {
    id: string;
    productName: string;
    productImage: string | null;
    quantity: number;
    price: number;
  };
  order: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    deliveredAt: string | null;
    shop: { id: string; name: string; slug: string };
  };
  buyer: { id: string; fullName: string; phone: string };
}

export interface ComplaintList {
  items: Complaint[];
  total: number;
  page: number;
  limit: number;
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const createComplaint = (token: string, orderId: string, body: CreateComplaintInput) =>
  apiFetch<Complaint>(`/api/v1/orders/${orderId}/complaints`, {
    method: 'POST', token, body: JSON.stringify(body),
  });

export const listMyComplaints = (token: string, params: { status?: string; page?: number } = {}) =>
  apiFetch<ComplaintList>(`/api/v1/complaints${qs(params)}`, { token });

export const escalateComplaint = (token: string, id: string) =>
  apiFetch<Complaint>(`/api/v1/complaints/${id}/escalate`, { method: 'POST', token });

export const respondComplaint = (token: string, id: string, body: { accept: boolean; message: string }) =>
  apiFetch<Complaint>(`/api/v1/complaints/${id}/seller-respond`, {
    method: 'POST', token, body: JSON.stringify(body),
  });

export const listSellerComplaints = (token: string, params: { status?: string; page?: number } = {}) =>
  apiFetch<ComplaintList>(`/api/v1/seller/complaints${qs(params)}`, { token });

export const listAdminComplaints = (token: string, params: { status?: string; page?: number } = {}) =>
  apiFetch<ComplaintList>(`/api/v1/admin/complaints${qs(params)}`, { token });

export const decideComplaint = (
  token: string,
  id: string,
  body: { outcome: 'RESOLVED' | 'REJECTED'; note?: string },
) =>
  apiFetch<Complaint>(`/api/v1/admin/complaints/${id}/decide`, {
    method: 'POST', token, body: JSON.stringify(body),
  });
