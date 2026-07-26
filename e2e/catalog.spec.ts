import { test, expect } from '@playwright/test';
import { tc, V1 } from './helpers/testforge';

test(tc('044', 'Daftar produk default tampil dengan paginasi'), async ({ request }) => {
  // 1. GET /products tanpa filter -> halaman 1, limit default 20.
  const page1 = await request.get(`${V1}/products`);
  expect(page1.status()).toBe(200);
  const b1 = (await page1.json()).data;

  expect(b1.page).toBe(1);
  expect(b1.limit).toBe(20);
  expect(Array.isArray(b1.items)).toBe(true);
  expect(b1.items.length).toBeGreaterThan(0);
  expect(b1.items.length).toBeLessThanOrEqual(20);
  expect(typeof b1.total).toBe('number');

  // 2. Minta page=2 -> halaman berikutnya, isinya berbeda dari halaman 1.
  const page2 = await request.get(`${V1}/products?page=2`);
  expect(page2.status()).toBe(200);
  const b2 = (await page2.json()).data;

  expect(b2.page).toBe(2);
  expect(b2.total).toBe(b1.total);
  if (b1.total > b1.limit) {
    expect(b2.items.length).toBeGreaterThan(0);
    const idsPage1 = new Set(b1.items.map((p: { id: string }) => p.id));
    expect(b2.items.some((p: { id: string }) => idsPage1.has(p.id))).toBe(false);
  }
});

test(tc('048', 'Lihat detail produk via slug'), async ({ request }) => {
  const list = await request.get(`${V1}/products?limit=1`);
  const first = (await list.json()).data.items[0];
  expect(first, 'katalog kosong — jalankan `npm run db:seed`').toBeTruthy();

  // 1. GET /products/:slug -> detail lengkap.
  const res = await request.get(`${V1}/products/${first.slug}`);
  expect(res.status()).toBe(200);
  const p = (await res.json()).data;

  expect(p.slug).toBe(first.slug);
  expect(p.name).toBeTruthy();
  expect(typeof p.price).toBe('number');
  expect(p.description).toBeTruthy();
  expect(typeof p.stock).toBe('number');
  expect(Array.isArray(p.images)).toBe(true);
  expect(Array.isArray(p.variants)).toBe(true);
  expect(p.shop?.id).toBeTruthy();

  // 2. Slug tidak ada -> 404.
  const missing = await request.get(`${V1}/products/slug-yang-pasti-tidak-ada-123`);
  expect(missing.status()).toBe(404);
});
