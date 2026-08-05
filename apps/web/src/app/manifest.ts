import type { MetadataRoute } from 'next';
import {
  BRAND_BACKGROUND_COLOR,
  BRAND_COLOR,
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_TITLE,
} from '@/lib/brand';

/**
 * Manifest PWA (M15-D1) — supaya Tokopudidi bisa dipasang ke home screen
 * Android / desktop. Next menyajikannya di `/manifest.webmanifest` dan
 * menyisipkan `<link rel="manifest">` sendiri; root layout sengaja TIDAK punya
 * field `manifest` (lihat catatan di layout.tsx).
 *
 * Tanpa service worker — sesuai scope M15-D1, offline caching tidak termasuk.
 *
 * Ikon PNG di `public/` dibuat sekali lewat `scripts/generate-pwa-icons.mjs`
 * dari `app/icon.svg`, bukan digambar ulang.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // `id` mengunci identitas aplikasi terinstal. Tanpa ini identitasnya
    // diturunkan dari `start_url`, sehingga mengubah start_url suatu hari nanti
    // akan terbaca sebagai aplikasi BARU — pengguna lama tidak dapat update.
    id: '/',
    name: BRAND_TITLE,
    short_name: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    lang: 'id',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: BRAND_BACKGROUND_COLOR,
    theme_color: BRAND_COLOR,
    categories: ['shopping'],
    icons: [
      // "any" dan "maskable" sengaja jadi entri terpisah, bukan satu entri
      // `purpose: 'any maskable'`. Ikon maskable itu full-bleed: kalau dipakai
      // sebagai "any" (mis. di tab desktop / daftar aplikasi), dia tampil
      // sebagai kotak hijau penuh tanpa sudut membulat.
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
