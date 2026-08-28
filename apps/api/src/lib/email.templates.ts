// M14-A2 — isi email transaksional.
//
// Fungsi di sini **murni**: data masuk, `{ subject, html }` keluar, tanpa
// menyentuh DB atau transport. Itu yang membuatnya bisa diuji tanpa SMTP
// maupun Postgres — dan template email justru bagian yang paling gampang
// rusak diam-diam, karena tidak ada yang melihatnya sampai ada pelanggan
// yang menerimanya.
//
// Tidak memakai template engine, sesuai rencana: lima email, satu layout.
import { formatRupiah, formatTanggal } from '@tokopudidi/shared';

/**
 * Escape untuk konteks teks HTML.
 *
 * Ini bukan formalitas. Isi email dirakit dari data yang diketik orang lain —
 * nama toko, nama produk, catatan admin, nama pembeli. Nama toko berisi
 * `<img src=x onerror=...>` yang masuk mentah ke sini akan dikirimkan ke inbox
 * orang, dan sebagian klien email merender HTML. Yang keluar dari sini harus
 * selalu lewat fungsi ini kecuali memang HTML yang kita tulis sendiri.
 */
export function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Origin situs untuk tautan di email. `WEB_ORIGIN` dipakai ulang (var yang
 * sama dengan CORS) supaya tidak ada var kedua yang bisa berbeda isinya —
 * email yang menunjuk ke host yang salah lebih buruk daripada email tanpa
 * tautan. Kalau berisi beberapa origin, yang pertama dianggap kanonik.
 */
export function siteOrigin(): string {
  const raw = process.env.WEB_ORIGIN?.split(',')[0]?.trim();
  return (raw || 'http://localhost:3000').replace(/\/$/, '');
}

const BRAND = '#1FA463'; // sumbernya apps/web/src/lib/brand.ts — disalin karena api tidak mengimpor web.

/** Layout bersama: header brand, isi, footer. Semua email memakai ini. */
function layout(judul: string, isiHtml: string, cta?: { label: string; path: string }): string {
  const tombol = cta
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(siteOrigin() + cta.path)}"
         style="background:${BRAND};color:#fff;text-decoration:none;padding:12px 20px;
         border-radius:8px;display:inline-block;font-weight:600">${escapeHtml(cta.label)}</a></p>`
    : '';
  return `<!doctype html>
<html lang="id"><body style="margin:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:${BRAND};color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;font-weight:700;font-size:18px">Tokopudidi</div>
    <div style="background:#fff;padding:24px 20px;border-radius:0 0 12px 12px">
      <h1 style="margin:0 0 12px;font-size:18px">${escapeHtml(judul)}</h1>
      ${isiHtml}
      ${tombol}
    </div>
    <p style="color:#6b7280;font-size:12px;text-align:center;margin:16px 0 0">
      Email ini dikirim otomatis oleh Tokopudidi. Tidak perlu dibalas.
    </p>
  </div>
</body></html>`;
}

function tabelItem(items: { name: string; qty: number; price: number }[]): string {
  const baris = items
    .map(
      (it) => `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #f3f4f6">${escapeHtml(it.name)} <span style="color:#6b7280">× ${escapeHtml(it.qty)}</span></td>
        <td style="padding:6px 0;border-bottom:1px solid #f3f4f6;text-align:right;white-space:nowrap">${escapeHtml(formatRupiah(it.price * it.qty))}</td>
      </tr>`,
    )
    .join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">${baris}</table>`;
}

// ── 1. Pesanan dibuat → pembeli ──────────────────────────────────────────────

const INSTRUKSI: Record<string, string> = {
  COD: 'Bayar tunai ke kurir saat pesanan tiba.',
  TRANSFER_MANUAL: 'Transfer sesuai total di atas, lalu unggah bukti bayar di halaman pesanan.',
  QRIS_MOCK: 'Selesaikan pembayaran QRIS di halaman pesanan sebelum batas waktu habis.',
};

export function orderCreatedEmail(o: {
  orderNumber: string;
  total: number;
  paymentMethod: string;
  shopName: string;
  createdAt: Date | string;
  items: { name: string; qty: number; price: number }[];
}) {
  const isi = `
    <p style="margin:0;font-size:14px">Pesanan kamu di <strong>${escapeHtml(o.shopName)}</strong> sudah kami terima
    pada ${escapeHtml(formatTanggal(o.createdAt))}.</p>
    <p style="margin:12px 0 0;font-size:14px">Nomor pesanan: <strong>${escapeHtml(o.orderNumber)}</strong></p>
    ${tabelItem(o.items)}
    <p style="margin:0;font-size:15px"><strong>Total: ${escapeHtml(formatRupiah(o.total))}</strong></p>
    <p style="margin:12px 0 0;font-size:14px;color:#374151">${escapeHtml(
      INSTRUKSI[o.paymentMethod] ?? 'Cek halaman pesanan untuk instruksi pembayaran.',
    )}</p>`;
  return {
    subject: `Pesanan ${o.orderNumber} berhasil dibuat`,
    html: layout('Pesanan berhasil dibuat', isi, { label: 'Lihat Pesanan', path: '/pesanan' }),
  };
}

// ── 2. Pesanan dibayar → pemilik toko ────────────────────────────────────────

export function orderPaidEmail(o: { orderNumber: string; total: number; buyerName: string; orderId: string }) {
  const isi = `
    <p style="margin:0;font-size:14px">Pesanan <strong>${escapeHtml(o.orderNumber)}</strong> dari
    ${escapeHtml(o.buyerName)} sudah dibayar sebesar <strong>${escapeHtml(formatRupiah(o.total))}</strong>.</p>
    <p style="margin:12px 0 0;font-size:14px;color:#374151">Segera proses dan kirim pesanannya ya.</p>`;
  return {
    subject: `Pesanan ${o.orderNumber} sudah dibayar`,
    html: layout('Ada pesanan yang sudah dibayar', isi, {
      label: 'Proses Pesanan',
      path: `/seller/pesanan/${o.orderId}`,
    }),
  };
}

// ── 3. Pesanan dikirim + resi → pembeli ──────────────────────────────────────

export function orderShippedEmail(o: {
  orderNumber: string;
  courierName: string;
  trackingNumber: string;
  orderId: string;
}) {
  const isi = `
    <p style="margin:0;font-size:14px">Pesanan <strong>${escapeHtml(o.orderNumber)}</strong> sudah dikirim.</p>
    <p style="margin:12px 0 0;font-size:14px">Kurir: <strong>${escapeHtml(o.courierName)}</strong><br/>
    No. resi: <strong>${escapeHtml(o.trackingNumber)}</strong></p>`;
  return {
    subject: `Pesanan ${o.orderNumber} sudah dikirim`,
    html: layout('Pesanan dalam perjalanan', isi, { label: 'Lacak Pesanan', path: `/pesanan/${o.orderId}` }),
  };
}

// ── 4. Komplain / refund diputus → pembeli ───────────────────────────────────

export function complaintDecidedEmail(o: {
  orderNumber: string;
  menang: boolean;
  catatan?: string | null;
  orderId: string;
}) {
  const judul = o.menang ? 'Komplain kamu dimenangkan' : 'Komplain kamu ditolak';
  const isi = `
    <p style="margin:0;font-size:14px">Komplain untuk pesanan <strong>${escapeHtml(o.orderNumber)}</strong>
    sudah diputus admin: <strong>${escapeHtml(o.menang ? 'diterima' : 'ditolak')}</strong>.</p>
    ${
      o.catatan
        ? `<p style="margin:12px 0 0;font-size:14px;color:#374151">Catatan admin: ${escapeHtml(o.catatan)}</p>`
        : ''
    }`;
  return {
    subject: `Hasil komplain pesanan ${o.orderNumber}`,
    html: layout(judul, isi, { label: 'Lihat Detail', path: `/pesanan/${o.orderId}` }),
  };
}

/** Varian untuk pengajuan refund (jalur admin refund, bukan komplain). */
export function refundDecidedEmail(o: {
  orderNumber: string;
  disetujui: boolean;
  catatan?: string | null;
  orderId: string;
}) {
  const isi = `
    <p style="margin:0;font-size:14px">Pengajuan refund untuk pesanan
    <strong>${escapeHtml(o.orderNumber)}</strong> ${escapeHtml(o.disetujui ? 'disetujui' : 'ditolak')} admin.</p>
    ${
      o.disetujui
        ? '<p style="margin:12px 0 0;font-size:14px;color:#374151">Dana akan dikembalikan ke metode pembayaranmu.</p>'
        : ''
    }
    ${
      o.catatan
        ? `<p style="margin:12px 0 0;font-size:14px;color:#374151">Catatan admin: ${escapeHtml(o.catatan)}</p>`
        : ''
    }`;
  return {
    subject: `Pengajuan refund ${o.orderNumber} ${o.disetujui ? 'disetujui' : 'ditolak'}`,
    html: layout(o.disetujui ? 'Refund disetujui' : 'Refund ditolak', isi, {
      label: 'Lihat Pesanan',
      path: `/pesanan/${o.orderId}`,
    }),
  };
}

// ── 5. Welcome saat register dengan email terisi ─────────────────────────────

export function welcomeEmail(o: { fullName: string }) {
  const isi = `
    <p style="margin:0;font-size:14px">Halo ${escapeHtml(o.fullName)}, akun Tokopudidi kamu sudah aktif.</p>
    <p style="margin:12px 0 0;font-size:14px;color:#374151">Mulai belanja dari ribuan produk UMKM,
    atau buka tokomu sendiri kapan saja lewat menu Akun.</p>`;
  return {
    subject: 'Selamat datang di Tokopudidi',
    html: layout('Selamat datang 👋', isi, { label: 'Mulai Belanja', path: '/' }),
  };
}
