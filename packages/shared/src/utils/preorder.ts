/**
 * Aturan estimasi pre-order (M15-B1).
 *
 * Diletakkan di shared, bukan inline di halaman pesanan, karena alasan yang
 * sama dengan `canViewInvoice`: aturannya kecil tapi punya jebakan (pesanan
 * campuran, snapshot yang boleh null), dan rumus yang ditulis langsung di JSX
 * tidak bisa diuji tanpa merender halaman.
 */

/** Bentuk minimum baris pesanan yang dibaca aturan di bawah. */
export interface PreorderItemFields {
  /** Snapshot `OrderItem.preorderDays` — null kalau item ini bukan pre-order saat dibeli. */
  preorderDays?: number | null;
}

/**
 * Lama proses terpanjang di antara item sebuah pesanan — `0` kalau tidak ada
 * satu pun item pre-order.
 *
 * Dipakai TERLAMA, bukan rata-rata atau terpendek: pesanan dikirim sebagai satu
 * paket, jadi tanggal yang berarti bagi pembeli adalah kapan item paling lambat
 * selesai diproses. Memakai rata-rata akan menjanjikan tanggal yang sudah pasti
 * dilewati sejak awal.
 */
export function maxPreorderDays(items: PreorderItemFields[]): number {
  return items.reduce(
    (max, it) => (it.preorderDays != null && it.preorderDays > max ? it.preorderDays : max),
    0,
  );
}

/**
 * Tanggal estimasi selesai diproses — `null` kalau pesanan tidak memuat
 * pre-order sama sekali, atau belum dibayar (tanpa `paidAt` tidak ada titik
 * mulai yang bisa dipertanggungjawabkan; menghitung dari "sekarang" akan
 * membuat estimasinya mundur setiap kali halaman dibuka).
 *
 * Hari kalender, bukan hari kerja — sengaja sederhana, dan itu yang dijanjikan
 * ke pembeli lewat teks "N hari" di badge.
 */
export function preorderEstimate(
  items: PreorderItemFields[],
  paidAt: Date | string | null | undefined,
): Date | null {
  const hari = maxPreorderDays(items);
  if (hari <= 0 || !paidAt) return null;
  return new Date(new Date(paidAt).getTime() + hari * 86_400_000);
}
