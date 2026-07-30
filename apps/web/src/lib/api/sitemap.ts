import { apiFetch } from './client';

export interface SitemapEntry {
  slug: string;
  updatedAt: string;
}

export interface SitemapData {
  products: SitemapEntry[];
  shops: SitemapEntry[];
  categories: SitemapEntry[];
}

/**
 * Data sitemap dari API (M12-D3).
 *
 * Mengembalikan `null` kalau API tidak terjangkau, bukan melempar: sitemap
 * dibangun saat build/revalidate, dan build produksi tidak boleh gagal hanya
 * karena API belum siap.
 */
export async function getSitemapEntries(): Promise<SitemapData | null> {
  try {
    return await apiFetch<SitemapData>('/api/v1/sitemap');
  } catch {
    return null;
  }
}
