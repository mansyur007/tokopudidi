/**
 * Origin publik situs — dasar untuk `metadataBase`, sitemap, robots, dan URL
 * kanonik di JSON-LD (M12-D3).
 *
 * Wajib absolut: `metadataBase` yang relatif membuat Next menyusun `og:url` dan
 * `og:image` sebagai path relatif, yang diabaikan crawler.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

/** Gabung path ke origin situs tanpa garis miring ganda. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
