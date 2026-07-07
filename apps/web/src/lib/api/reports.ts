import { apiFetch } from './client';
import type { CreateReportInput, ReportTargetType } from '@tokopudidi/shared';

// ===== Buyer =====
export const createReport = (token: string, body: CreateReportInput) =>
  apiFetch<{ id: string }>('/api/v1/reports', {
    method: 'POST', token, body: JSON.stringify(body),
  });

// ===== Admin =====
export interface AdminReportRow {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description: string | null;
  evidenceUrls: string[];
  status: 'OPEN' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED';
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporter: { id: string; fullName: string; phone: string };
  target: { label: string; linkUrl: string | null };
}

export const listAdminReports = (token: string, status = 'OPEN', type = 'ALL', page = 1) =>
  apiFetch<{ items: AdminReportRow[]; total: number; page: number; limit: number }>(
    `/api/v1/admin/reports?status=${status}&type=${type}&page=${page}`,
    { token },
  );

export const resolveAdminReport = (token: string, id: string, action: 'ACTIONED' | 'DISMISSED', note?: string) =>
  apiFetch(`/api/v1/admin/reports/${id}/resolve`, {
    method: 'POST', token, body: JSON.stringify({ action, note }),
  });
