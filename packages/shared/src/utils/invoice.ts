/**
 * Aturan "pesanan ini punya invoice" (M13-A2).
 *
 * Satu sumber kebenaran untuk tombol "Lihat Invoice" di detail pesanan DAN
 * untuk guard halaman invoice-nya. Kalau keduanya menyimpan daftar status
 * sendiri-sendiri, cepat atau lambat tombolnya tampil untuk pesanan yang
 * halamannya menolak — atau lebih buruk, sebaliknya.
 */

/**
 * Invoice baru ada setelah uangnya masuk. `PENDING_PAYMENT` dan `EXPIRED`
 * belum pernah dibayar; `CANCELLED` batal sebelum jadi; `REFUNDED` sudah
 * dikembalikan — mencetak dokumen yang menyatakan pembayaran atas pesanan
 * yang uangnya sudah balik justru menyesatkan.
 */
export const INVOICE_STATUSES = [
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export function canViewInvoice(status: string | null | undefined): boolean {
  return !!status && (INVOICE_STATUSES as readonly string[]).includes(status);
}

/** Nomor invoice diturunkan dari nomor pesanan — tidak ada penomoran terpisah. */
export function invoiceNumber(orderNumber: string): string {
  return `INV/${orderNumber}`;
}
