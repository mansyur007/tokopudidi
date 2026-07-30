// SEO & metadata (M12-D3). Menguji keluaran sungguhan: endpoint sitemap,
// /sitemap.xml & /robots.txt yang dirender Next, serta tag <head> dan JSON-LD
// di halaman produk.
import { test, expect } from '@playwright/test';
import { tc, V1, WEB_URL } from './helpers/testforge';

test(tc('140', 'Endpoint sitemap mengembalikan slug produk, toko & kategori'), async ({ request }) => {
  const res = await request.get(`${V1}/sitemap`);
  expect(res.status()).toBe(200);
  const d = (await res.json()).data;

  for (const key of ['products', 'shops', 'categories'] as const) {
    expect(Array.isArray(d[key]), `${key} harus array`).toBe(true);
    expect(d[key].length, `${key} kosong — jalankan db:seed`).toBeGreaterThan(0);
    expect(d[key][0].slug).toBeTruthy();
    // lastModified di sitemap diturunkan dari ini, jadi harus tanggal yang sah.
    expect(Number.isNaN(Date.parse(d[key][0].updatedAt))).toBe(false);
  }
});

test(tc('141', '/sitemap.xml sah dan memuat URL produk'), async ({ request }) => {
  const res = await request.get(`${WEB_URL}/sitemap.xml`);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('xml');

  const xml = await res.text();
  expect(xml).toContain('<urlset');
  // Namespace sitemap protocol 0.9 — persis seperti ini, bukan schemas.sitemaps.org.
  expect(xml).toContain('http://www.sitemaps.org/schemas/sitemap/0.9');

  // Ambil slug produk nyata, lalu pastikan URL-nya ada di sitemap.
  const list = await request.get(`${V1}/products?limit=1`);
  const slug = (await list.json()).data.items[0].slug as string;
  expect(xml).toContain(`/produk/${slug}`);

  // Rute bersesi tidak boleh ikut terdaftar.
  for (const jalan of ['/checkout', '/keranjang', '/akun', '/admin', '/seller']) {
    expect(xml, `${jalan} tidak boleh ada di sitemap`).not.toContain(`<loc>${WEB_URL}${jalan}</loc>`);
  }
});

test(tc('142', '/robots.txt menutup panel & menunjuk sitemap'), async ({ request }) => {
  const res = await request.get(`${WEB_URL}/robots.txt`);
  expect(res.status()).toBe(200);
  const txt = await res.text();

  expect(txt).toContain('User-Agent: *');
  for (const jalan of ['/admin', '/seller', '/akun', '/checkout', '/keranjang', '/chat', '/scrap']) {
    expect(txt, `${jalan} harus di-disallow`).toContain(`Disallow: ${jalan}`);
  }
  expect(txt).toContain('Sitemap:');
  expect(txt).toContain('/sitemap.xml');
});

test(tc('143', 'Halaman produk punya meta OG, canonical & JSON-LD sah'), async ({ page, request }) => {
  const list = await request.get(`${V1}/products?limit=1`);
  const p = (await list.json()).data.items[0] as { slug: string; name: string };

  await page.goto(`/produk/${p.slug}`);

  // Title & description terisi dari produk, bukan default root layout.
  await expect(page).toHaveTitle(new RegExp(p.name.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const desc = page.locator('head meta[name="description"]');
  await expect(desc).toHaveCount(1);
  expect((await desc.getAttribute('content'))?.length).toBeGreaterThan(10);

  // Canonical absolut.
  const canonical = await page.locator('head link[rel="canonical"]').getAttribute('href');
  expect(canonical).toContain(`/produk/${p.slug}`);
  expect(canonical).toMatch(/^https?:\/\//);

  // OG dasar.
  await expect(page.locator('head meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator('head meta[property="og:url"]')).toHaveCount(1);

  // JSON-LD: harus satu blok yang benar-benar bisa di-parse.
  const raw = await page.locator('head script[type="application/ld+json"], script[type="application/ld+json"]').first().textContent();
  expect(raw).toBeTruthy();
  const ld = JSON.parse(raw!);
  expect(ld['@type']).toBe('Product');
  expect(ld.offers.priceCurrency).toBe('IDR');
  expect(typeof ld.offers.price).toBe('number');
  expect(ld.offers.availability).toMatch(/InStock|OutOfStock/);

  // Kalau ada gambar, semuanya wajib http(s) — data-URI tidak boleh bocor.
  if (ld.image) {
    for (const src of ld.image) expect(src).toMatch(/^https?:\/\//);
  }
  // aggregateRating hanya boleh ada kalau reviewCount > 0.
  if (ld.aggregateRating) expect(ld.aggregateRating.reviewCount).toBeGreaterThan(0);
});

test(tc('144', 'Halaman toko & kategori punya metadata sendiri'), async ({ page, request }) => {
  const shops = await request.get(`${V1}/shops/featured`);
  const shop = (await shops.json()).data[0] as { slug: string; name: string };

  await page.goto(`/toko/${shop.slug}`);
  const shopCanonical = await page.locator('head link[rel="canonical"]').getAttribute('href');
  expect(shopCanonical).toContain(`/toko/${shop.slug}`);
  await expect(page.locator('head meta[property="og:title"]')).toHaveCount(1);

  const cats = await request.get(`${V1}/categories`);
  const body = (await cats.json()).data;
  const cat = (Array.isArray(body) ? body : body.items)[0] as { slug: string };

  await page.goto(`/kategori/${cat.slug}`);
  const catCanonical = await page.locator('head link[rel="canonical"]').getAttribute('href');
  expect(catCanonical).toContain(`/kategori/${cat.slug}`);
});
