// Helper SEO & metadata (M12-D3). Murni, tanpa dependensi Next — supaya bisa
// diuji di suite vitest yang sudah ada.

import { getEffectivePrice } from './price';

/**
 * Gambar yang boleh dipakai `og:image` / JSON-LD.
 *
 * Upload seller memakai `FileReader.readAsDataURL`, jadi sebagian
 * `ProductImage.url` di produksi berisi base64 `data:` URI. Itu **tidak sah**
 * sebagai `og:image` (crawler tidak bisa mengambilnya) dan menggelembungkan
 * `<head>` sampai megabyte. Hanya http(s) absolut yang diloloskan.
 */
export function isPublicImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url.trim());
}

/** Gambar publik pertama dari daftar; `null` kalau tidak ada yang layak. */
export function firstPublicImage(
  urls: Array<string | null | undefined>,
): string | null {
  return urls.find((u) => isPublicImageUrl(u))?.trim() ?? null;
}

/**
 * Ringkas teks jadi deskripsi meta.
 *
 * Dipotong di batas kata supaya tidak berakhir di tengah kata, dan newline
 * dirapikan karena deskripsi produk sering multi-baris.
 */
export function metaDescription(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export interface JsonLdProductInput {
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice?: number | null;
  saleStartAt?: Date | string | null;
  saleEndAt?: Date | string | null;
  stock: number;
  condition: 'NEW' | 'USED';
  ratingAvg: number;
  ratingCount: number;
  images: Array<string | null | undefined>;
  shopName: string;
}

/**
 * JSON-LD schema.org/Product.
 *
 * Harga memakai **harga efektif** (sale M9-B3 ikut terhitung) supaya yang
 * tampil di hasil pencarian sama dengan yang dilihat pembeli di halaman —
 * ketidakcocokan harga bisa membuat rich result ditolak.
 *
 * `aggregateRating` hanya disertakan kalau benar-benar ada ulasan; Google
 * menolak `aggregateRating` dengan `reviewCount` nol.
 */
export function buildProductJsonLd(p: JsonLdProductInput, siteUrl: string): Record<string, unknown> {
  const url = `${siteUrl.replace(/\/$/, '')}/produk/${p.slug}`;
  const images = p.images.filter((u): u is string => isPublicImageUrl(u));

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: metaDescription(p.description, 300),
    url,
    ...(images.length > 0 && { image: images }),
    itemCondition:
      p.condition === 'NEW'
        ? 'https://schema.org/NewCondition'
        : 'https://schema.org/UsedCondition',
    brand: { '@type': 'Brand', name: p.shopName },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'IDR',
      price: getEffectivePrice(p),
      availability:
        p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: p.shopName },
    },
  };

  if (p.ratingCount > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(p.ratingAvg.toFixed(1)),
      reviewCount: p.ratingCount,
    };
  }

  return jsonLd;
}

/** Rute yang tidak boleh diindeks — dipakai `robots.ts`. */
export const ROBOTS_DISALLOW = [
  '/admin',
  '/seller',
  '/scrap',
  '/akun',
  '/checkout',
  '/keranjang',
  '/chat',
  '/notifikasi',
  '/masuk',
  '/daftar',
  '/lupa-password',
];
