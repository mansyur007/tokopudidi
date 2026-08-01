// Badge reputasi toko (M14-B1).
//
// Badge **diturunkan saat dibaca**, tidak disimpan sebagai kolom dan tidak
// diperbarui cron: kriterianya seluruhnya dari angka yang sudah hidup di baris
// Shop (`ratingAvg`, `totalSold`, `ktpVerified`, `isOfficialStore`). Kolom
// tersendiri berarti ada dua sumber kebenaran yang bisa berselisih, dan toko
// yang baru melewati ambang harus menunggu cron berikutnya untuk terlihat naik.
//
// Utang yang dibayar di sini (M10-A10): halaman produk dan header toko selama
// ini menampilkan "Official Store" / ✅ dari `ktpVerified`. Itu keliru —
// `ktpVerified` cuma berarti KTP penjualnya sudah dicek admin, sedangkan
// "Official Store" adalah status kurasi yang punya kolomnya sendiri
// (`isOfficialStore`). Menyamakan keduanya membuat setiap toko terverifikasi
// tampil sebagai official store di mata pembeli.

export type ShopBadge = 'OFFICIAL' | 'STAR_PLUS' | 'STAR';

export interface ShopBadgeFields {
  isOfficialStore?: boolean | null;
  ktpVerified?: boolean | null;
  ratingAvg?: number | null;
  totalSold?: number | null;
}

// Ambang performa. Dinaikkan/diturunkan di sini saja — UI hanya membaca hasil.
export const BADGE_STAR_PLUS = { ratingAvg: 4.5, totalSold: 100 } as const;
export const BADGE_STAR = { ratingAvg: 4, totalSold: 10 } as const;

/**
 * Badge tertinggi yang berhak dipakai toko, atau null kalau belum ada.
 *
 * Urutannya mengikat: OFFICIAL > STAR_PLUS > STAR. Official adalah keputusan
 * kurasi admin, jadi tidak boleh kalah oleh badge performa yang dihitung mesin
 * — toko official yang ratingnya sedang turun tetap official.
 *
 * `ktpVerified` disyaratkan untuk kedua badge performa: tanpa itu, toko yang
 * identitasnya belum pernah diperiksa bisa memoles dirinya sendiri lewat
 * segelintir transaksi berating bagus.
 */
export function getShopBadge(shop: ShopBadgeFields | null | undefined): ShopBadge | null {
  if (!shop) return null;
  if (shop.isOfficialStore) return 'OFFICIAL';
  if (!shop.ktpVerified) return null;

  const rating = shop.ratingAvg ?? 0;
  const sold = shop.totalSold ?? 0;

  if (rating >= BADGE_STAR_PLUS.ratingAvg && sold >= BADGE_STAR_PLUS.totalSold) return 'STAR_PLUS';
  if (rating >= BADGE_STAR.ratingAvg && sold >= BADGE_STAR.totalSold) return 'STAR';
  return null;
}

export interface ShopBadgeMeta {
  /** Ikon teks — dipakai langsung di markup, tanpa aset tambahan. */
  icon: string;
  /** Nama badge, tampil di samping nama toko kalau ruangnya cukup. */
  label: string;
  /** Isi `title=` — pembeli harus bisa tahu badge ini artinya apa. */
  description: string;
}

const BADGE_META: Record<ShopBadge, ShopBadgeMeta> = {
  OFFICIAL: {
    icon: '🏛️',
    label: 'Official Store',
    description: 'Toko resmi yang dikurasi Tokopudidi',
  },
  STAR_PLUS: {
    icon: '⭐',
    label: 'Star Plus',
    description: `Toko terverifikasi dengan rating ≥ ${BADGE_STAR_PLUS.ratingAvg} dan ${BADGE_STAR_PLUS.totalSold}+ produk terjual`,
  },
  STAR: {
    icon: '⭐',
    label: 'Star',
    description: `Toko terverifikasi dengan rating ≥ ${BADGE_STAR.ratingAvg} dan ${BADGE_STAR.totalSold}+ produk terjual`,
  },
};

export function getShopBadgeMeta(badge: ShopBadge): ShopBadgeMeta;
export function getShopBadgeMeta(badge: ShopBadge | null | undefined): ShopBadgeMeta | null;
export function getShopBadgeMeta(badge: ShopBadge | null | undefined): ShopBadgeMeta | null {
  return badge ? BADGE_META[badge] : null;
}
