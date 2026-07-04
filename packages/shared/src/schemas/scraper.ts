import { z } from 'zod';

// ============================================================
// Web scraper Tokopedia → format import Tokopudidi
// ------------------------------------------------------------
// Bentuk hasil scrape sengaja DISELARASKAN dengan productCreateSchema
// (lihat schemas/seller.ts) supaya JSON-nya bisa langsung dipakai untuk
// impor produk ke Tokopudidi di kemudian hari. Field di luar
// productCreateSchema (sourceUrl, categoryHint, ratingAvg, soldText)
// bersifat metadata referensi dan diabaikan saat impor.
// ============================================================

function isTokopediaHost(hostname: string): boolean {
  return /(^|\.)tokopedia\.com$/i.test(hostname);
}

export const scrapeRequestSchema = z.object({
  url: z
    .string()
    .trim()
    .url('URL tidak valid')
    .refine((u) => {
      try {
        return isTokopediaHost(new URL(u).hostname);
      } catch {
        return false;
      }
    }, 'Harus URL dari tokopedia.com'),
  // Batasi jumlah produk agar runtime & risiko blokir terkendali di VPS 2-vCPU.
  maxProducts: z.number().int().min(1).max(40).default(20),
});
export type ScrapeRequest = z.infer<typeof scrapeRequestSchema>;

// Satu produk hasil scrape — subset selaras productCreateSchema + metadata.
export interface ScrapedProduct {
  // --- selaras dengan productCreateSchema (bisa langsung diimpor) ---
  name: string;
  description: string;
  price: number; // rupiah, integer
  stock: number; // default 0 — perlu diisi manual oleh seller saat impor
  minOrderQty: number;
  weight: number; // gram — best-effort, default 1000
  condition: 'NEW' | 'USED';
  imageUrls: string[]; // maksimal 5 (batas Tokopudidi)
  variants?: { name: string; priceModifier: number; stock: number }[];
  // --- metadata referensi (diabaikan saat impor) ---
  sourceUrl: string;
  categoryHint?: string;
  ratingAvg?: number;
  soldText?: string;
}

export interface ScrapedShop {
  name?: string;
  slug: string;
  url: string;
  location?: string;
}

export interface ScrapeResult {
  shop: ScrapedShop;
  products: ScrapedProduct[];
  meta: {
    requestedUrl: string;
    scrapedAt: string; // ISO
    productCount: number;
    warnings: string[];
  };
}
