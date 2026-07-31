import { safeReturnPath } from '@tokopudidi/shared';

/**
 * Baca `?return=` dari URL saat ini untuk mengembalikan user ke halaman asal
 * setelah login. Validasinya di `safeReturnPath` (shared) supaya bisa diuji.
 *
 * Sengaja membaca `window.location` saat dipanggil (di event handler), bukan
 * lewat `useSearchParams` — hook itu memaksa halaman keluar dari prerender
 * statis dan menuntut Suspense boundary, padahal nilainya cuma dibutuhkan
 * sesaat setelah submit.
 */
export function readReturnPath(): string | null {
  if (typeof window === 'undefined') return null;
  return safeReturnPath(new URLSearchParams(window.location.search).get('return'));
}
