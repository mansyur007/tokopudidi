// Helper untuk display status pesanan dalam Bahasa Indonesia ramah.
import type { OrderStatus } from '@/lib/api/orders';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Belum Bayar',
  PAID: 'Sudah Bayar',
  PROCESSING: 'Diproses',
  SHIPPED: 'Dikirim',
  DELIVERED: 'Sampai',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  REFUNDED: 'Direfund',
};

export const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'bg-orange-100 text-orange-700',
  PAID:            'bg-blue-100 text-blue-700',
  PROCESSING:      'bg-blue-100 text-blue-700',
  SHIPPED:         'bg-purple-100 text-purple-700',
  DELIVERED:       'bg-green-100 text-green-700',
  COMPLETED:       'bg-green-100 text-green-700',
  CANCELLED:       'bg-gray-100 text-gray-700',
  REFUNDED:        'bg-gray-100 text-gray-700',
};

export const TABS: { key: string; label: string }[] = [
  { key: 'ALL',             label: 'Semua' },
  { key: 'PENDING_PAYMENT', label: 'Belum Bayar' },
  { key: 'PROCESSING',      label: 'Diproses' },
  { key: 'SHIPPED',         label: 'Dikirim' },
  { key: 'COMPLETED',       label: 'Selesai' },
  { key: 'CANCELLED',       label: 'Dibatalkan' },
];
