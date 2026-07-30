// Aturan bottom nav mobile (M12-A11). Dipisah dari komponen supaya bisa diuji
// tanpa merender React.

export interface BottomNavItem {
  href: string;
  label: string;
  icon: 'home' | 'menu' | 'heart' | 'truck' | 'user';
  /** Sumber angka badge; undefined = tanpa badge. */
  badge?: 'pesananBelumBayar';
}

/**
 * Lima tab bottom nav.
 *
 * Susunannya ditentukan oleh apa yang benar-benar tidak punya jalan lain di
 * mobile — header menyembunyikan Kategori, Wishlist, Chat, dan Akun di bawah
 * breakpoint md. Wishlist masuk menggantikan tab Chat karena wishlist tadinya
 * tidak bisa dijangkau sama sekali dari mobile, sementara chat tetap tersedia
 * lewat `ChatFab` (yang di item ini ikut diperbaiki agar tampil di mobile).
 *
 * Notifikasi sengaja TIDAK jadi tab: `NotifBell` di header sudah tampil di
 * mobile, jadi tab notif hanya akan menduplikasi akses yang sudah ada sambil
 * menyingkirkan tujuan yang belum punya akses.
 */
export const BOTTOM_NAV: BottomNavItem[] = [
  { href: '/',          label: 'Beranda',  icon: 'home' },
  { href: '/kategori',  label: 'Kategori', icon: 'menu' },
  { href: '/wishlist',  label: 'Wishlist', icon: 'heart' },
  { href: '/pesanan',   label: 'Pesanan',  icon: 'truck', badge: 'pesananBelumBayar' },
  { href: '/akun',      label: 'Akun',     icon: 'user' },
];

/**
 * Halaman yang menyembunyikan bottom nav.
 *
 * Checkout & halaman bayar: alurnya bertombol aksi besar di dasar layar, nav
 * ikut bersaing dan memancing salah tekan. Chat: composer-nya menempel di
 * dasar layar.
 */
const HIDDEN_PREFIXES = ['/checkout', '/chat'];

/** Cocok untuk `/pesanan/<id>/bayar`, bukan `/pesanan` atau `/pesanan/<id>`. */
const PAYMENT_PAGE = /^\/pesanan\/[^/]+\/bayar\/?$/;

export function isBottomNavHidden(pathname: string): boolean {
  if (PAYMENT_PAGE.test(pathname)) return true;
  return HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Tab aktif. Beranda hanya cocok persis — kalau memakai `startsWith`, `/` akan
 * cocok dengan semua rute dan seluruh tab menyala bersamaan.
 */
export function isBottomNavItemActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
