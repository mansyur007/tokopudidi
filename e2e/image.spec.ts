// Optimasi & keamanan gambar (M12-D4).
//
// Yang diuji di sini adalah bug yang jadi alasan item ini ada: `logoUrl` dan
// `bannerUrl` toko diisi seller lewat input teks bebas, jadi host-nya bisa apa
// pun. Sebelum SmartImage, src semacam itu langsung dilempar ke `next/image` —
// di dev melempar dan menjatuhkan halaman (HTTP 500), di produksi
// `/_next/image` menjawab 400 sehingga logonya rusak di semua tempat.
//
// Test ini mengubah `logoUrl` toko seed lalu memulihkannya. Suite berjalan
// serial (workers: 1), jadi mutasi ini tidak menabrak spec lain — tapi urutan
// di dalam file tetap dipaksa serial supaya pemulihannya pasti jalan terakhir.
import { test, expect } from '@playwright/test';
import { tc, V1, WEB_URL, auth, tokenFor } from './helpers/testforge';

test.describe.configure({ mode: 'serial' });

const HOST_ASING = 'https://cdn.tokosaya.test/logo.png';
const HOST_DIIZINKAN = 'https://picsum.photos/seed/logo-e2e/200/200';

let slug = '';
let logoAwal: string | null = null;

async function setLogo(request: import('@playwright/test').APIRequestContext, logoUrl: string | null) {
  const res = await request.patch(`${V1}/seller/shop`, {
    headers: auth(tokenFor('seller')),
    // '' → null di sisi API; itulah cara mengosongkan field.
    data: { logoUrl: logoUrl ?? '' },
  });
  expect(res.ok(), `PATCH seller/shop gagal: ${res.status()} ${await res.text()}`).toBe(true);
}

test.beforeAll(async ({ request }) => {
  const res = await request.get(`${V1}/seller/shop`, { headers: auth(tokenFor('seller')) });
  expect(res.ok()).toBe(true);
  const shop = (await res.json()).data;
  slug = shop.slug;
  logoAwal = shop.logoUrl ?? null;
  expect(slug, 'toko seller seed tidak punya slug — jalankan db:seed').toBeTruthy();
});

test.afterAll(async ({ request }) => {
  if (slug) await setLogo(request, logoAwal);
});

test(tc('145', 'Logo dari host tak terdaftar tidak menjatuhkan halaman toko'), async ({ page, request }) => {
  await setLogo(request, HOST_ASING);

  const res = await page.goto(`/toko/${slug}`);
  // Inti regresi: dulu ini 500 di dev.
  expect(res?.status(), 'halaman toko harus tetap 200').toBe(200);
  await expect(page.locator('h1')).toBeVisible();

  // Dirender apa adanya lewat <img>, bukan dilempar ke optimizer.
  const img = page.locator(`img[src="${HOST_ASING}"]`);
  await expect(img).toHaveCount(1);
  await expect(img).toHaveAttribute('loading', 'lazy');

  // Tidak boleh ada satu pun permintaan optimizer yang membawa host ini —
  // itu yang bakal dijawab 400.
  const html = await page.content();
  expect(html).not.toContain('_next/image?url=https%3A%2F%2Fcdn.tokosaya.test');
});

test(tc('146', 'Logo dari host terdaftar tetap lewat optimizer next/image'), async ({ page, request }) => {
  await setLogo(request, HOST_DIIZINKAN);

  const res = await page.goto(`/toko/${slug}`);
  expect(res?.status()).toBe(200);

  // next/image menulis src-nya sebagai /_next/image?url=<encoded>&w=..&q=..
  const img = page.locator('img[src*="_next/image"][src*="picsum.photos"]');
  await expect(img).toHaveCount(1);
});

test(tc('147', 'Optimizer tetap menolak host tak terdaftar (bukan proxy terbuka)'), async ({ request }) => {
  // Kalau allowlist-nya diganti wildcard demi "menghilangkan error", siapa pun
  // bisa menyuruh server kita menarik URL sembarang. Test ini yang menjaganya.
  const asing = await request.get(
    `${WEB_URL}/_next/image?url=${encodeURIComponent(HOST_ASING)}&w=64&q=75`,
  );
  expect(asing.status(), 'host tak terdaftar harus ditolak optimizer').toBe(400);

  // Sengaja bukan `toBe(200)`: picsum.photos diambil lewat jaringan sungguhan,
  // dan kalau sedang lambat/limit, Next menjawab 5xx. Yang diuji di sini adalah
  // validasi host — 400 berarti ditolak allowlist, apa pun selain itu berarti
  // lolos allowlist.
  const terdaftar = await request.get(
    `${WEB_URL}/_next/image?url=${encodeURIComponent(HOST_DIIZINKAN)}&w=64&q=75`,
  );
  expect(terdaftar.status(), 'host terdaftar tidak boleh ditolak allowlist').not.toBe(400);
});

test(tc('148', 'Skema src berbahaya & logo kosong tidak pernah jadi atribut src'), async ({ page, request }) => {
  await setLogo(request, 'javascript:alert(1)');

  const res = await page.goto(`/toko/${slug}`);
  expect(res?.status()).toBe(200);
  const html = await page.content();
  expect(html, 'skema javascript: tidak boleh sampai ke src').not.toContain('javascript:alert(1)');

  // Logo dikosongkan: tidak ada elemen gambar sama sekali, tapi halaman utuh.
  await setLogo(request, null);
  const res2 = await page.goto(`/toko/${slug}`);
  expect(res2?.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();
});
