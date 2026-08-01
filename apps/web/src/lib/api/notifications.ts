import { apiFetch } from './client';

export interface NotificationItem {
  id: string;
  // Cerminkan enum `NotificationType` di schema. `NEW_QUESTION` (M8-A3) selama
  // ini tertinggal di sini sehingga notifikasi diskusi jatuh ke label "Sistem";
  // ditambahkan sekalian bersama SHOP_BROADCAST (M13-B2) supaya daftarnya utuh.
  type: 'ORDER_UPDATE' | 'NEW_MESSAGE' | 'PROMO' | 'SYSTEM' | 'NEW_QUESTION' | 'SHOP_BROADCAST';
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
