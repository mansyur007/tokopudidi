// Klasifikasi sumber gambar (M12-D4).
//
// Latar belakang: aplikasi ini belum punya object storage. Semua gambar yang
// diunggah lewat UI disimpan sebagai data-URI base64 di kolom string
// (`FileReader.readAsDataURL` di ProductForm, ReportModal, ComplaintModal,
// ChatRoom, seller/daftar, pesanan/ulasan, pesanan/[id]/bayar, admin/banner).
// Di sisi lain ada tiga sumber URL http sungguhan:
//   1. seed (picsum.photos),
//   2. input teks bebas seller — `logoUrl`/`bannerUrl` di seller/pengaturan
//      dan "tempel URL gambar" di admin/banner, host-nya sembarang,
//   3. hasil scrape Tokopedia (images.tokopedia.net dkk).
//
// `next/image` hanya boleh menerima host yang terdaftar di
// `images.remotePatterns`. Kalau tidak: di dev ia melempar dan menjatuhkan
// seluruh halaman (HTTP 500), di produksi throw-nya dimatikan tapi
// `/_next/image` menjawab 400 sehingga gambarnya rusak. Karena host pada kasus
// (2) dan (3) di luar kendali kita, keputusan optimasi harus diambil per-src
// saat render — itulah gunanya `classifyImageSrc`.

/**
 * Host gambar remote yang boleh dioptimasi `next/image`.
 *
 * SUMBER TUNGGAL: `apps/web/next.config.js` menyusun `images.remotePatterns`
 * dari daftar ini, dan `SmartImage` memakai daftar yang sama untuk memutuskan
 * apakah sebuah src aman dilewatkan ke `<Image>`. Jangan duplikasi daftarnya —
 * begitu keduanya berbeda, yang satu mengizinkan apa yang satunya tolak.
 */
export const ALLOWED_IMAGE_HOSTS: readonly string[] = [
  // Seed & data demo.
  'picsum.photos',
  'images.unsplash.com',
  'placehold.co',
  // Hasil impor scraper (M6). Tanpa ini gambar di /scrap selalu rusak.
  'images.tokopedia.net',
  'assets.tokopedia.net',
];

export type ImageSrcKind =
  /** Tidak ada gambar, atau skema yang tidak kita render sama sekali. */
  | 'empty'
  /** `data:image/...` — hasil unggahan lewat FileReader. Tidak bisa dioptimasi. */
  | 'data'
  /** http(s) di host yang terdaftar. Aman untuk `next/image`. */
  | 'optimizable'
  /** http(s) di host lain, atau path lokal. Render apa adanya lewat `<img>`. */
  | 'passthrough';

/** Hostname dari src absolut; `null` kalau bukan URL yang bisa di-parse. */
export function imageHost(src: string): string | null {
  try {
    return new URL(src).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Tentukan bagaimana sebuah src gambar harus dirender.
 *
 * Sengaja allowlist skema, bukan blocklist: apa pun di luar `data:image/`,
 * `http:`, `https:` dan path absolut lokal dianggap `'empty'` supaya src aneh
 * (mis. `javascript:`) tidak pernah sampai ke atribut `src`.
 */
export function classifyImageSrc(
  src: string | null | undefined,
  allowedHosts: readonly string[] = ALLOWED_IMAGE_HOSTS,
): ImageSrcKind {
  if (!src) return 'empty';
  const s = src.trim();
  if (s.length === 0) return 'empty';

  // Hanya data-URI gambar. `data:text/html,...` bukan gambar dan tidak dirender.
  if (/^data:image\/[a-z0-9.+-]+[;,]/i.test(s)) return 'data';

  // Path lokal. Dilewatkan apa adanya — repo ini belum punya `apps/web/public`,
  // jadi melewatkannya ke optimizer hanya menambah round-trip untuk 404.
  // `//host/x` protocol-relative ditolak `next/image`, jadi jangan diperlakukan
  // sebagai path lokal.
  if (s.startsWith('/')) return s.startsWith('//') ? 'empty' : 'passthrough';

  if (!/^https?:\/\//i.test(s)) return 'empty';

  const host = imageHost(s);
  if (host === null) return 'empty';
  return allowedHosts.includes(host) ? 'optimizable' : 'passthrough';
}
