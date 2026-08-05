// Guard hidrasi auth di halaman buyer.
//
// Yang tidak bisa diuji unit test: halaman bertoken yang dibuka lewat URL
// LANGSUNG (bookmark, tautan notifikasi, refresh keras) tidak boleh membuang
// pembeli yang sudah login ke /masuk. Bug-nya lolos berkali-kali karena hanya
// muncul di build produksi — di `next dev` tidak pernah kelihatan — dan karena
// navigasi dari dalam aplikasi (klik link) selalu jalan: store `persist` sudah
// terisi duluan, jadi guard-nya tidak pernah salah menyimpulkan.
//
// Penyebabnya: pada commit render pertama `user` selalu null (zustand memberi
// React `getInitialState` sebagai server snapshot), jadi guard yang membaca
// `user` tanpa `useAuthHydrated()` langsung menyimpulkan "belum login".
import { test, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

/**
 * Suntik sesi buyer dalam bentuk yang dipakai zustand/persist, SEBELUM skrip
 * halaman jalan — persis kondisi "buka bookmark". Pola sama dengan
 * `injectBuyerSession` di invoice.spec.ts dan TC-155 di admin-log.spec.ts.
 */
async function injectBuyerSession(page: Page, request: APIRequestContext) {
  const token = tokenFor('buyer');
  const me = await request.get(`${V1}/auth/me`, { headers: auth(token) });
  expect(me.status(), await me.text()).toBe(200);
  const user = (await me.json()).data;

  const sesi = JSON.stringify({
    state: { user, tokens: { accessToken: token, refreshToken: '' } },
    version: 0,
  });
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    ['tokopudidi-auth', sesi],
  );
}

/** Pesanan mana pun milik buyer — halaman /bayar hanya perlu id yang sah. */
async function anyOrderId(request: APIRequestContext): Promise<string> {
  const res = await request.get(`${V1}/orders?status=ALL&page=1`, {
    headers: auth(tokenFor('buyer')),
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()).data;
  const orders = (Array.isArray(body) ? body : body.items) as { id: string }[];
  expect(orders.length, 'seed butuh minimal 1 pesanan buyer').toBeGreaterThan(0);
  return orders[0].id;
}

/**
 * Tiap halaman buyer yang guard-nya menyimpulkan "belum login" dari `user`.
 * `tanda` adalah elemen yang HANYA ada kalau halamannya benar-benar dirender —
 * kalau guard-nya salah, halaman keburu pindah ke /masuk dan tanda ini hilang.
 *
 * Daftar ini harus memuat SEMUA halaman buyer bertoken. Kalau nanti ada halaman
 * baru yang memakai `useAuthHydrated`, tambahkan ke sini juga — regresi kelas
 * ini tidak terlihat di `next dev` maupun saat berpindah halaman dari dalam
 * aplikasi, jadi spec inilah satu-satunya yang menangkapnya otomatis.
 */
function halamanBuyer(orderId: string) {
  return [
    { url: '/akun',                 tanda: (p: Page) => p.getByRole('link', { name: 'Alamat Saya' }) },
    { url: '/keranjang',            tanda: (p: Page) => p.getByRole('heading', { name: 'Keranjang Belanja' }) },
    // Dibuka lewat URL langsung, `sessionStorage.checkout-items` kosong, jadi
    // yang tampil layar "belum ada item" — bukan <h1>Checkout</h1>. Itu justru
    // layar yang paling penting dijaga di sini: sebelum #53, layar itulah yang
    // muncul saat sesi belum terbaca dan menuduh pembeli tidak memilih apa-apa.
    { url: '/checkout',             tanda: (p: Page) => p.getByText('Belum ada item yang dipilih') },
    { url: '/akun/alamat',          tanda: (p: Page) => p.getByRole('heading', { name: 'Alamat Saya' }) },
    { url: '/akun/toko-favorit',    tanda: (p: Page) => p.getByRole('heading', { name: 'Toko Favorit' }) },
    { url: '/chat',                 tanda: (p: Page) => p.getByRole('heading', { name: 'Chat' }) },
    { url: '/komplain',             tanda: (p: Page) => p.getByRole('heading', { name: 'Komplain Saya' }) },
    { url: '/notifikasi',           tanda: (p: Page) => p.getByRole('heading', { name: 'Notifikasi' }) },
    { url: '/pesanan',              tanda: (p: Page) => p.getByRole('heading', { name: 'Pesanan Saya' }) },
    { url: '/pesanan/ulasan',       tanda: (p: Page) => p.getByRole('heading', { name: 'Berikan Ulasan' }) },
    { url: `/pesanan/${orderId}/bayar`, tanda: (p: Page) => p.getByRole('heading', { name: 'Pembayaran Pesanan' }) },
    { url: '/wishlist',             tanda: (p: Page) => p.getByRole('heading', { name: 'Wishlist' }) },
  ];
}

/** Jangkar regex untuk URL relatif, mis. "/akun" → /\/akun$/. */
function akhiranUrl(url: string): RegExp {
  return new RegExp(`${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

/**
 * Halaman benar-benar BERTAHAN di tempatnya, bukan cuma sempat kelihatan.
 *
 * Jeda 1 detiknya disengaja dan bukan `waitForTimeout` asal-asalan: guard yang
 * salah menembakkan `router.push('/masuk')` dari sebuah effect, sementara
 * commit berikutnya (setelah store terisi) sudah sempat merender isi halaman.
 * Tanpa jeda, assertion-nya balapan dengan router dan lolos di celah itu —
 * persis yang terjadi waktu spec ini diuji-coba pada kode yang belum diperbaiki.
 */
async function bertahanDiTempat(
  page: Page,
  url: string,
  tanda: (p: Page) => Locator,
  konteks: string,
) {
  await expect(tanda(page), `${url} (${konteks}): isi halaman tidak pernah muncul`).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page, `${url} (${konteks}): terlempar ke /masuk`).toHaveURL(akhiranUrl(url));
  await expect(tanda(page), `${url} (${konteks}): isi halaman hilang lagi`).toBeVisible();
}

test(tc('184', 'Halaman buyer bertoken bertahan saat dibuka lewat URL langsung & refresh keras'), async ({ page, request }) => {
  const orderId = await anyOrderId(request);
  await injectBuyerSession(page, request);

  for (const { url, tanda } of halamanBuyer(orderId)) {
    await test.step(`URL langsung: ${url}`, async () => {
      await page.goto(url);
      await bertahanDiTempat(page, url, tanda, 'URL langsung');

      // Refresh keras — jalur yang sama, tapi ini yang paling sering dilakukan
      // pengguna dan yang bikin bug ini kelihatan di produksi.
      await page.reload();
      await bertahanDiTempat(page, url, tanda, 'refresh keras');
    });
  }
});

test(tc('185', 'Guard tetap menutup: tanpa sesi, halaman buyer tetap dibuang ke /masuk'), async ({ page, request }) => {
  // Sisi sebaliknya dari TC-184. Menunggu `hydrated` gampang kebablasan jadi
  // "tidak pernah redirect sama sekali" — kalau itu terjadi, halaman bertoken
  // jadi terbuka untuk siapa saja dan test ini yang menangkapnya.
  const orderId = await anyOrderId(request);

  for (const { url } of halamanBuyer(orderId)) {
    await test.step(`Tanpa sesi: ${url}`, async () => {
      await page.goto(url);
      await expect(page, `${url} tidak menutup diri untuk pengunjung anonim`).toHaveURL(/\/masuk/);
    });
  }
});
