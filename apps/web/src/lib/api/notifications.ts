import { apiFetch } from './client';

export interface NotificationItem {
  id: string;
  type: 'ORDER_UPDATE' | 'NEW_MESSAGE' | 'PROMO' | 'SYSTEM';
  title: string;
  body: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export const listNotifications = (token: string) =>
  apiFetch<NotificationItem[]>('/api/v1/notifications', { token });

export const getUnreadCount = (token: string) =>
  apiFetch<{ count: number }>('/api/v1/notifications/unread-count', { token });

export const markNotificationRead = (token: string, id: string) =>
  apiFetch(`/api/v1/notifications/${id}/read`, { method: 'POST', token });

export const markAllNotificationsRead = (token: string) =>
  apiFetch('/api/v1/notifications/read-all', { method: 'POST', token });
