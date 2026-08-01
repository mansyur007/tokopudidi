// Broadcast promo ke follower (M13-B2). Yang diuji di sini adalah hal-hal yang
// hanya kelihatan dengan DB nyata: penolakan sebelum jatah 24 jam terpakai,
// jeda 24 jam itu sendiri, dan notifikasi yang benar-benar sampai ke follower
// (fan-out-nya berjalan SETELAH respons, jadi harus ditunggu, bukan diasumsikan).
//
// Urutan test di berkas ini penting dan sengaja: pemeriksaan penolakan
// dijalankan lebih dulu, karena setelah satu broadcast berhasil terkirim,
// jeda 24 jam menutup semua jalur lain dengan 429 sebelum sempat sampai ke
// pemeriksaan yang mau diuji. Suite ini memang serial (workers: 1).
import { test, expect } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

type Req = import('@playwright/test').APIRequestContext;

const BODY = { title: 'Diskon Akhir Pekan', body: 'Semua produk pilihan diskon sampai Minggu ini ya!' };

async function sellerShop(request: Req, token: string): Promise<{ id: string; slug: string }> {
  const res = await request.get(`${V1}/seller/shop`, { headers: auth(token) });
  expect(res.status()).toBe(200);
  const shop = (await res.json()).data;
  return { id: shop.id, slug: shop.slug };
}

async function broadcastStatus(request: Req, token: string) {
  const res = await request.get(`${V1}/seller/broadcast`, { headers: auth(token) });
  expect(res.status()).toBe(200);
  return (await res.json()).data as {
    items: { id: string; title: string; recipientCount: number }[];
    total: number;
    status: { followerCount: number; cooldownRemainingMs: number; canSend: boolean };
  };
}

test(tc('165', 'Broadcast: ditolak tanpa hak akses, payload tak masuk akal, produk toko lain, & toko tanpa follower'), async ({ request }) => {
  const sellerToken = tokenFor('seller');
  const buyerToken = tokenFor('buyer');
  const shop = await sellerShop(request, sellerToken);

  // 1. Tanpa token -> 401. Broadcast menulis notifikasi massal; endpoint ini
  //    tidak boleh bisa disentuh anonim sama sekali.
  expect((await request.post(`${V1}/seller/broadcast`, { data: BODY })).status()).toBe(401);
  expect((await request.get(`${V1}/seller/broadcast`)).status()).toBe(401);

  // 2. Buyer biasa -> 403 (bukan 404 yang menyamarkan endpointnya).
  const asBuyer = await request.post(`${V1}/seller/broadcast`, {
    headers: auth(buyerToken), data: BODY,
  });
  expect(asBuyer.status()).toBe(403);

  // 3. Payload tak masuk akal -> 400, dan yang penting: tidak menghabiskan
  //    jatah 24 jam. Dicek lewat `total` riwayat yang tidak bergerak.
  const before = await broadcastStatus(request, sellerToken);
  for (const bad of [
    { title: '', body: BODY.body },                      // judul kosong
    { title: BODY.title, body: 'promo' },                // isi terlalu pendek
    { title: 'a'.repeat(61), body: BODY.body },          // judul melewati batas
    { ...BODY, productId: 'bukan-uuid' },                // produk bukan uuid
  ]) {
    const res = await request.post(`${V1}/seller/broadcast`, {
      headers: auth(sellerToken), data: bad,
    });
    expect(res.status(), `payload ${JSON.stringify(bad).slice(0, 40)} harus ditolak`).toBe(400);
  }

  // 4. productId milik toko lain -> 400. Kalau lolos, seller bisa memakai
  //    daftar follower-nya sendiri untuk mengiklankan produk orang lain.
  const list = await request.get(`${V1}/products?limit=30`);
  const cards = (await list.json()).data.items as { id: string; shop: { id: string } }[];
  const asing = cards.find((p) => p.shop.id !== shop.id);
  expect(asing, 'seed butuh produk dari toko selain toko seller').toBeTruthy();
  const foreign = await request.post(`${V1}/seller/broadcast`, {
    headers: auth(sellerToken), data: { ...BODY, productId: asing!.id },
  });
  expect(foreign.status()).toBe(400);

  // 5. Toko tanpa follower -> 400 dengan pesan jelas, BUKAN sukses kosong yang
  //    diam-diam memakai jatah 24 jam untuk kiriman yang tidak sampai ke siapa pun.
  await request.delete(`${V1}/shops/${shop.slug}/follow`, { headers: auth(buyerToken) });
  const kosong = await broadcastStatus(request, sellerToken);
  if (kosong.status.followerCount === 0) {
    const res = await request.post(`${V1}/seller/broadcast`, {
      headers: auth(sellerToken), data: BODY,
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toContain('follower');
  }

  // Semua penolakan di atas tidak boleh meninggalkan jejak riwayat.
  const after = await broadcastStatus(request, sellerToken);
  expect(after.total, 'permintaan yang ditolak tidak boleh menulis baris riwayat').toBe(before.total);
});

test(tc('166', 'Broadcast: terkirim ke follower, notifikasi sampai, dan kiriman kedua kena jeda 24 jam'), async ({ request }) => {
  const sellerToken = tokenFor('seller');
  const buyerToken = tokenFor('buyer');
  const shop = await sellerShop(request, sellerToken);

  // Pastikan ada follower yang bisa diperiksa notifikasinya.
  const follow = await request.post(`${V1}/shops/${shop.slug}/follow`, { headers: auth(buyerToken) });
  expect(follow.status()).toBe(200);

  const before = await broadcastStatus(request, sellerToken);
  // Jeda 24 jam tidak bisa direset lewat API (endpoint reset = lubang untuk
  // menghindari batasnya di produksi), jadi test ini menuntut DB yang segar.
  expect(
    before.status.cooldownRemainingMs,
    'toko seed sudah broadcast dalam 24 jam terakhir — jalankan `npm run db:seed` di DB test',
  ).toBe(0);
  expect(before.status.followerCount).toBeGreaterThan(0);

  const judul = `Promo E2E ${Date.now()}`;

  const sent = await request.post(`${V1}/seller/broadcast`, {
    headers: auth(sellerToken), data: { ...BODY, title: judul },
  });
  expect(sent.status()).toBe(201);
  const record = (await sent.json()).data;
  expect(record.recipientCount).toBe(before.status.followerCount);

  // Notifikasi ditulis setelah respons terkirim, jadi ditunggu — bukan dibaca
  // sekali lalu disimpulkan gagal.
  await expect.poll(async () => {
    const res = await request.get(`${V1}/notifications`, { headers: auth(buyerToken) });
    const notifs = (await res.json()).data as { type: string; title: string; linkUrl: string | null }[];
    return notifs.find((n) => n.title === judul) ?? null;
  }, { timeout: 15_000, message: 'follower harus menerima notifikasi broadcast' }).not.toBeNull();

  const notifRes = await request.get(`${V1}/notifications`, { headers: auth(buyerToken) });
  const notif = ((await notifRes.json()).data as { type: string; title: string; linkUrl: string }[])
    .find((n) => n.title === judul)!;
  expect(notif.type).toBe('SHOP_BROADCAST');
  // Tanpa produk yang disorot, tautannya ke halaman toko pengirim.
  expect(notif.linkUrl).toBe(`/toko/${shop.slug}`);

  // Riwayat mencatat jangkauannya.
  const after = await broadcastStatus(request, sellerToken);
  expect(after.total).toBe(before.total + 1);
  expect(after.items[0].title).toBe(judul);
  expect(after.items[0].recipientCount).toBe(record.recipientCount);
  expect(after.status.canSend).toBe(false);
  expect(after.status.cooldownRemainingMs).toBeGreaterThan(0);

  // Kiriman kedua dalam 24 jam -> 429 dengan sisa waktu yang bisa dibaca.
  const kedua = await request.post(`${V1}/seller/broadcast`, {
    headers: auth(sellerToken), data: { ...BODY, title: `${judul} (lagi)` },
  });
  expect(kedua.status()).toBe(429);
  expect((await kedua.json()).message).toMatch(/\d+ (jam|menit)/);

  // Dan yang ditolak itu tidak menambah riwayat.
  const akhir = await broadcastStatus(request, sellerToken);
  expect(akhir.total).toBe(after.total);
});
