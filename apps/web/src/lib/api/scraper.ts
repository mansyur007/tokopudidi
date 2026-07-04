import { apiFetch } from './client';
import type { ScrapeResult } from '@tokopudidi/shared';

// Scrape toko/produk Tokopedia (khusus admin). Bisa berjalan puluhan detik
// karena menjalankan headless browser + kunjungi tiap halaman produk.
export function scrapeTokopedia(
  url: string,
  maxProducts: number,
  token: string,
): Promise<ScrapeResult> {
  return apiFetch<ScrapeResult>('/api/v1/admin/scrape', {
    method: 'POST',
    token,
    body: JSON.stringify({ url, maxProducts }),
  });
}
