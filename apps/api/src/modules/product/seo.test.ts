// Unit test helper SEO (M12-D3) — logic yang tidak bergantung DB.
import { describe, it, expect } from 'vitest';
import {
  isPublicImageUrl,
  firstPublicImage,
  metaDescription,
  buildProductJsonLd,
  ROBOTS_DISALLOW,
} from '@tokopudidi/shared';

const SITE = 'https://toko.emha.space';
// Upload seller memakai FileReader.readAsDataURL, jadi bentuk inilah yang nyata
// tersimpan di ProductImage.url untuk produk yang difoto sendiri penjualnya.
const DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

describe('isPublicImageUrl', () => {
  it('meloloskan http & https', () => {
    expect(isPublicImageUrl('https://picsum.photos/seed/a/600/600')).toBe(true);
    expect(isPublicImageUrl('http://example.com/a.png')).toBe(true);
  });

  // Inti dari helper ini: data-URI tidak bisa diambil crawler dan kalau lolos ke
  // <head> akan menggelembungkan HTML sampai megabyte.
  it('menolak data-URI base64', () => {
    expect(isPublicImageUrl(DATA_URI)).toBe(false);
  });

  it('menolak path relatif, kosong, null', () => {
    expect(isPublicImageUrl('/uploads/a.png')).toBe(false);
    expect(isPublicImageUrl('')).toBe(false);
    expect(isPublicImageUrl(null)).toBe(false);
    expect(isPublicImageUrl(undefined)).toBe(false);
  });

  it('tidak tertipu skema yang cuma mengandung http', () => {
    expect(isPublicImageUrl('javascript:alert(1)//http://x')).toBe(false);
    expect(isPublicImageUrl('data:text/html,http://x')).toBe(false);
  });
});

describe('firstPublicImage', () => {
  it('ambil yang publik pertama, lewati data-URI di depannya', () => {
    expect(firstPublicImage([DATA_URI, 'https://a.test/b.png'])).toBe('https://a.test/b.png');
  });

  it('null kalau semuanya data-URI', () => {
    expect(firstPublicImage([DATA_URI, DATA_URI])).toBeNull();
  });

  it('null untuk daftar kosong', () => {
    expect(firstPublicImage([])).toBeNull();
  });
});

describe('metaDescription', () => {
  it('teks pendek diteruskan apa adanya', () => {
    expect(metaDescription('Kopi robusta Lampung.')).toBe('Kopi robusta Lampung.');
  });

  it('newline & spasi ganda dirapikan jadi satu baris', () => {
    expect(metaDescription('Baris satu\n\nBaris  dua')).toBe('Baris satu Baris dua');
  });

  it('dipotong di batas kata, bukan tengah kata', () => {
    const out = metaDescription('a'.repeat(50) + ' ' + 'b'.repeat(200), 60);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/b{2,}…$/);
  });

  it('hasil tidak melebihi batas + elipsis', () => {
    const out = metaDescription('kata '.repeat(100), 160);
    expect(out.length).toBeLessThanOrEqual(161);
  });
});

describe('buildProductJsonLd', () => {
  const base = {
    name: 'Kopi Robusta Lampung 250gr',
    slug: 'kopi-robusta-lampung-250gr-tokoma',
    description: 'Kopi robusta single origin Lampung, roasting medium.',
    price: 38_000,
    stock: 60,
    condition: 'NEW' as const,
    ratingAvg: 4.6,
    ratingCount: 12,
    images: ['https://picsum.photos/seed/kopi/600/600'],
    shopName: 'Toko Mas Joko',
  };

  it('bentuk dasar schema.org/Product', () => {
    const ld = buildProductJsonLd(base, SITE) as any;
    expect(ld['@type']).toBe('Product');
    expect(ld.url).toBe(`${SITE}/produk/${base.slug}`);
    expect(ld.offers.priceCurrency).toBe('IDR');
    expect(ld.offers.availability).toBe('https://schema.org/InStock');
    expect(ld.itemCondition).toBe('https://schema.org/NewCondition');
  });

  it('garis miring ganda di siteUrl tidak bocor ke URL', () => {
    const ld = buildProductJsonLd(base, `${SITE}/`) as any;
    expect(ld.url).toBe(`${SITE}/produk/${base.slug}`);
  });

  // Harga di rich result harus sama dengan yang dilihat pembeli, kalau tidak
  // Google bisa menolak rich result-nya.
  it('memakai harga sale saat diskon aktif (M9-B3)', () => {
    const ld = buildProductJsonLd({
      ...base,
      salePrice: 30_000,
      saleStartAt: new Date(Date.now() - 3600_000),
      saleEndAt: new Date(Date.now() + 3600_000),
    }, SITE) as any;
    expect(ld.offers.price).toBe(30_000);
  });

  it('kembali ke harga normal di luar periode diskon', () => {
    const ld = buildProductJsonLd({
      ...base,
      salePrice: 30_000,
      saleStartAt: new Date(Date.now() - 7200_000),
      saleEndAt: new Date(Date.now() - 3600_000),
    }, SITE) as any;
    expect(ld.offers.price).toBe(38_000);
  });

  it('stok habis jadi OutOfStock', () => {
    const ld = buildProductJsonLd({ ...base, stock: 0 }, SITE) as any;
    expect(ld.offers.availability).toBe('https://schema.org/OutOfStock');
  });

  // Google menolak aggregateRating dengan reviewCount 0.
  it('tanpa ulasan, aggregateRating tidak disertakan', () => {
    const ld = buildProductJsonLd({ ...base, ratingAvg: 0, ratingCount: 0 }, SITE) as any;
    expect('aggregateRating' in ld).toBe(false);
  });

  it('dengan ulasan, aggregateRating disertakan', () => {
    const ld = buildProductJsonLd(base, SITE) as any;
    expect(ld.aggregateRating.reviewCount).toBe(12);
    expect(ld.aggregateRating.ratingValue).toBe(4.6);
  });

  it('gambar data-URI tidak masuk JSON-LD', () => {
    const ld = buildProductJsonLd({ ...base, images: [DATA_URI] }, SITE) as any;
    expect('image' in ld).toBe(false);
  });

  it('hanya gambar publik yang lolos, urutannya dipertahankan', () => {
    const ld = buildProductJsonLd({
      ...base,
      images: [DATA_URI, 'https://a.test/1.png', null, 'https://a.test/2.png'],
    }, SITE) as any;
    expect(ld.image).toEqual(['https://a.test/1.png', 'https://a.test/2.png']);
  });

  it('hasilnya bisa di-serialize jadi JSON yang sah', () => {
    const ld = buildProductJsonLd(base, SITE);
    expect(() => JSON.parse(JSON.stringify(ld))).not.toThrow();
  });
});

describe('ROBOTS_DISALLOW', () => {
  it('menutup panel & area bersesi', () => {
    for (const p of ['/admin', '/seller', '/akun', '/checkout', '/keranjang', '/chat', '/scrap']) {
      expect(ROBOTS_DISALLOW).toContain(p);
    }
  });

  it('tidak menutup halaman katalog publik', () => {
    for (const p of ['/', '/cari', '/produk', '/toko', '/kategori']) {
      expect(ROBOTS_DISALLOW).not.toContain(p);
    }
  });
});
