/**
 * Identitas merek yang dipakai lintas metadata (M15-D1).
 *
 * Nilai-nilai ini muncul di lebih dari satu tempat — `<meta name="theme-color">`
 * di root layout, `theme_color` di manifest PWA, dan token `primary` Tailwind —
 * dan kalau salah satunya bergeser, warna bilah judul aplikasi terinstal berbeda
 * dari warna header yang dirender di dalamnya. Jadi satu sumber, di sini.
 */

/** Hijau primer brand. Sama dengan `primary.DEFAULT` di tailwind.config.ts (yang meng-import konstanta ini). */
export const BRAND_COLOR = '#1FA463';

/** Latar splash screen PWA. Putih supaya transisi ke halaman (putih) tidak berkedip. */
export const BRAND_BACKGROUND_COLOR = '#ffffff';

export const BRAND_NAME = 'Tokopudidi';
export const BRAND_TITLE = 'Tokopudidi — Belanja UMKM Indonesia';

export const BRAND_DESCRIPTION =
  'Marketplace untuk UMKM kecil Indonesia. Belanja sembako, fashion, kebutuhan rumah, semua dari toko tetangga.';
