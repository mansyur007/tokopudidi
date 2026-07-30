import type { MetadataRoute } from 'next';
import { ROBOTS_DISALLOW } from '@tokopudidi/shared';
import { SITE_URL } from '@/lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Panel, area akun, dan alur transaksi tidak ada gunanya di indeks —
        // sebagian bahkan butuh sesi dan hanya akan jadi soft-404 bagi crawler.
        disallow: ROBOTS_DISALLOW,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
