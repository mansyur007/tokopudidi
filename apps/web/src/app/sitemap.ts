import type { MetadataRoute } from 'next';
import { getSitemapEntries } from '@/lib/api/sitemap';
import { SITE_URL } from '@/lib/siteUrl';

// Sitemap disegarkan tiap jam. Katalog UMKM tidak berubah tiap menit, dan
// tanpa revalidate Next akan membangunnya sekali saat build lalu membeku.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statis: MetadataRoute.Sitemap = [
    { url: SITE_URL,                  changeFrequency: 'daily',  priority: 1 },
    { url: `${SITE_URL}/cari`,        changeFrequency: 'daily',  priority: 0.5 },
    { url: `${SITE_URL}/kategori`,    changeFrequency: 'weekly', priority: 0.6 },
  ];

  const data = await getSitemapEntries();
  // API tidak terjangkau saat build/revalidate: kembalikan yang statis saja.
  // Sitemap kosong lebih buruk daripada sitemap sebagian — Google menganggap
  // URL yang hilang sebagai sinyal untuk melepas indeks.
  if (!data) return statis;

  return [
    ...statis,
    ...data.categories.map((c) => ({
      url: `${SITE_URL}/kategori/${c.slug}`,
      lastModified: new Date(c.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...data.shops.map((s) => ({
      url: `${SITE_URL}/toko/${s.slug}`,
      lastModified: new Date(s.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...data.products.map((p) => ({
      url: `${SITE_URL}/produk/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
