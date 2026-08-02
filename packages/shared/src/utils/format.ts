// Format mata uang Rupiah: "Rp 1.234.567"
export function formatRupiah(value: number): string {
  if (!Number.isFinite(value)) return 'Rp 0';
  return 'Rp ' + Math.round(value).toLocaleString('id-ID');
}

// Format tanggal Indonesia: "12 Mei 2026"
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function formatTanggal(input: Date | string): string {
  const d = input instanceof Date ? input : new Date(input);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

// Format tanggal + jam Indonesia: "12 Mei 2026, 14.30"
export function formatTanggalWaktu(input: Date | string): string {
  const d = input instanceof Date ? input : new Date(input);
  const jam = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  return `${formatTanggal(d)}, ${jam}.${menit}`;
}

// "5 menit yang lalu", "kemarin", dll. Untuk display ringan di UI.
export function timeAgo(input: Date | string): string {
  const d = input instanceof Date ? input : new Date(input);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return formatTanggal(d);
}

/**
 * Sisa waktu untuk hitungan mundur: "02:15:09", atau "6 hari 21:30:47" kalau
 * lebih dari sehari.
 *
 * Bagian harinya bukan hiasan. Tanpa itu, event tujuh hari dirender
 * "165:30:47" — angka yang secara teknis benar tapi tidak terbaca siapa pun,
 * dan sempat lolos begitu saja sampai e2e menampilkannya. Detiknya tetap
 * ditampilkan seberapa pun jauhnya tenggat supaya jelas hitungannya hidup.
 *
 * Ditulis "hari", bukan disingkat "h": di layar yang sama ada satuan jam, dan
 * "6h" terbaca dua arti.
 */
export function formatSisaWaktu(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  const hari = Math.floor(total / 86400);
  const jam = Math.floor((total % 86400) / 3600);
  const menit = Math.floor((total % 3600) / 60);
  const detik = total % 60;
  const waktu = `${pad(jam)}:${pad(menit)}:${pad(detik)}`;
  return hari > 0 ? `${hari} hari ${waktu}` : waktu;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}
