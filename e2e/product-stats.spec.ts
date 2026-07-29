// Statistik produk seller (M11-B4). Menutup jalur ber-DB: bentuk respons,
// panjang deret hari per rentang, dan guard kepemilikan produk.
import { test, expect } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

async function firstOwnProductId(request: import('@playwright/test').APIRequestContext, token: string) {
  const res = await request.get(`${V1}/seller/products?limit=1`, { headers: auth(token) });
  const item = (await res.json()).data.items[0] as { id: string } | undefined;
  expect(item, 'seed produk seller kosong').toBeTruthy();
  return item!.id;
}

test(tc('129', 'Statistik produk: bentuk respons & rentang 7d/30d'), async ({ request }) => {
  const token = tokenFor('seller');
  const productId = await firstOwnProductId(request, token);

  // 1. Default (tanpa param) -> 7 hari.
  const def = await request.get(`${V1}/seller/products/${productId}/stats`, { headers: auth(token) });
  expect(def.status()).toBe(200);
  const d = (await def.json()).data;
  expect(d.range).toBe('7d');
  expect(d.chart).toHaveLength(7);

  // 2. Rentang 30 hari -> deret 30 titik, tetap berakhir di hari yang sama.
  const long = await request.get(`${V1}/seller/products/${productId}/stats?range=30d`, {
    headers: auth(token),
  });
  expect(long.status()).toBe(200);
  const l = (await long.json()).data;
  expect(l.range).toBe('30d');
  expect(l.chart).toHaveLength(30);
  expect(l.chart[29].date).toBe(d.chart[6].date);

  // 3. Rentang tak dikenal jatuh ke default, bukan error.
  const weird = await request.get(`${V1}/seller/products/${productId}/stats?range=90d`, {
    headers: auth(token),
  });
  expect(weird.status()).toBe(200);
  expect((await weird.json()).data.range).toBe('7d');

  // 4. Bentuk data.
  expect(d.product.id).toBe(productId);
  expect(typeof d.product.viewCount).toBe('number');
  expect(typeof d.totals.viewersInRange).toBe('number');
  expect(typeof d.totals.revenue).toBe('number');
  expect(Array.isArray(d.recentOrders)).toBe(true);

  // Setiap titik chart punya tanggal + angka, tidak ada hari yang bolong.
  for (const point of d.chart) {
    expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof point.count).toBe('number');
  }
  // Tanggal berurutan menaik dan unik.
  const dates = l.chart.map((p: { date: string }) => p.date);
  expect([...dates].sort()).toEqual(dates);
  expect(new Set(dates).size).toBe(30);

  // Konversi: null kalau belum ada penonton, selain itu angka >= 0.
  if (d.totals.viewersInRange === 0) {
    expect(d.totals.conversionPct).toBeNull();
  } else {
    expect(d.totals.conversionPct).toBeGreaterThanOrEqual(0);
  }
});

test(tc('130', 'Statistik produk toko lain tidak bisa diintip'), async ({ request }) => {
  const token = tokenFor('seller');

  const shopRes = await request.get(`${V1}/seller/shop`, { headers: auth(token) });
  const myShopSlug = (await shopRes.json()).data.slug as string;

  const catalog = await request.get(`${V1}/products?limit=50`);
  const all = (await catalog.json()).data.items as { id: string; shop: { slug: string } }[];
  const foreign = all.find((p) => p.shop.slug !== myShopSlug);
  expect(foreign, 'seed butuh minimal 2 toko').toBeTruthy();

  // Produk toko lain -> 404 (bukan 403, supaya keberadaan produknya tidak bocor).
  const res = await request.get(`${V1}/seller/products/${foreign!.id}/stats`, {
    headers: auth(token),
  });
  expect(res.status()).toBe(404);
});

test(tc('131', 'Statistik produk butuh peran seller'), async ({ request }) => {
  const sellerToken = tokenFor('seller');
  const productId = await firstOwnProductId(request, sellerToken);

  // Buyer tidak punya toko.
  const buyer = await request.get(`${V1}/seller/products/${productId}/stats`, {
    headers: auth(tokenFor('buyer')),
  });
  expect([403, 404]).toContain(buyer.status());

  // Tanpa token.
  const anon = await request.get(`${V1}/seller/products/${productId}/stats`);
  expect(anon.status()).toBe(401);

  // Id yang tidak ada -> 404, bukan 500.
  const missing = await request.get(
    `${V1}/seller/products/11111111-1111-4111-8111-111111111111/stats`,
    { headers: auth(sellerToken) },
  );
  expect(missing.status()).toBe(404);
});
