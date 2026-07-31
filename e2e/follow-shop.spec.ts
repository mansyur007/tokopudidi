// Follow / favorit toko (M13-A1). Menutup jalur yang butuh DB: idempotensi
// follow ganda, jumlah follower yang ikut bergerak, guard toko sendiri, dan
// jalur guest di browser (redirect ke /masuk dengan return URL).
import { test, expect } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

/** Toko pertama yang bukan milik siapa pun yang sedang dites. */
async function pickShop(request: import('@playwright/test').APIRequestContext) {
  const res = await request.get(`${V1}/shops/featured`);
  const shops = (await res.json()).data as { id: string; slug: string }[];
  expect(shops.length, 'seed butuh minimal 1 toko featured').toBeGreaterThan(0);
  return shops[0];
}

async function followerCountOf(
  request: import('@playwright/test').APIRequestContext,
  slug: string,
): Promise<number> {
  const res = await request.get(`${V1}/shops/${slug}`);
  expect(res.status()).toBe(200);
  return (await res.json()).data.followerCount as number;
}

test(tc('155', 'Follow toko: toggle, idempoten, dan jumlah follower ikut bergerak'), async ({ request }) => {
  const token = tokenFor('buyer');
  const shop = await pickShop(request);

  // Mulai dari keadaan bersih supaya angka awal bisa dipercaya walau run
  // sebelumnya berhenti di tengah.
  await request.delete(`${V1}/shops/${shop.slug}/follow`, { headers: auth(token) });
  const before = await followerCountOf(request, shop.slug);

  // 1. Follow.
  const follow = await request.post(`${V1}/shops/${shop.slug}/follow`, { headers: auth(token) });
  expect(follow.status()).toBe(200);
  expect(await followerCountOf(request, shop.slug)).toBe(before + 1);

  // 2. Follow kedua kali (klik ganda) tidak boleh menambah baris kedua.
  const again = await request.post(`${V1}/shops/${shop.slug}/follow`, { headers: auth(token) });
  expect(again.status()).toBe(200);
  expect(await followerCountOf(request, shop.slug)).toBe(before + 1);

  // 3. Muncul di daftar toko favorit + daftar id.
  const ids = await request.get(`${V1}/users/me/following/ids`, { headers: auth(token) });
  expect((await ids.json()).data).toContain(shop.id);

  const list = await request.get(`${V1}/users/me/following?page=1&limit=20`, { headers: auth(token) });
  expect(list.status()).toBe(200);
  const listed = (await list.json()).data;
  const card = listed.items.find((s: { id: string }) => s.id === shop.id);
  expect(card, 'toko yang di-follow harus ada di /users/me/following').toBeTruthy();
  // Bentuk kartu toko sama dengan /shops/featured — dipakai grid yang sama.
  expect(typeof card.ratingAvg).toBe('number');
  expect(card.slug).toBe(shop.slug);

  // 4. Unfollow mengembalikan keadaan semula.
  const unfollow = await request.delete(`${V1}/shops/${shop.slug}/follow`, { headers: auth(token) });
  expect(unfollow.status()).toBe(200);
  expect(await followerCountOf(request, shop.slug)).toBe(before);

  const idsAfter = await request.get(`${V1}/users/me/following/ids`, { headers: auth(token) });
  expect((await idsAfter.json()).data).not.toContain(shop.id);

  // 5. Unfollow saat sudah tidak follow bukan error — tombolnya idempoten juga.
  const twice = await request.delete(`${V1}/shops/${shop.slug}/follow`, { headers: auth(token) });
  expect(twice.status()).toBe(200);
});

test(tc('156', 'Follow toko: butuh login, tolak toko sendiri & toko tak dikenal'), async ({ request }) => {
  const shop = await pickShop(request);

  // 1. Tanpa token -> 401 (bukan diam-diam sukses).
  const anon = await request.post(`${V1}/shops/${shop.slug}/follow`);
  expect(anon.status()).toBe(401);
  const anonList = await request.get(`${V1}/users/me/following`);
  expect(anonList.status()).toBe(401);

  // 2. Seller follow tokonya sendiri -> 400. Kalau ini lolos, angka follower
  //    jadi menipu dan broadcast (M13-B2) mengirim notifikasi ke penjualnya.
  const sellerToken = tokenFor('seller');
  const own = await request.get(`${V1}/seller/shop`, { headers: auth(sellerToken) });
  const ownSlug = (await own.json()).data.slug as string;
  const self = await request.post(`${V1}/shops/${ownSlug}/follow`, { headers: auth(sellerToken) });
  expect(self.status()).toBe(400);

  // 3. Toko yang tidak ada -> 404, bukan baris follow yatim.
  const ghost = await request.post(`${V1}/shops/toko-yang-pasti-tidak-ada/follow`, {
    headers: auth(tokenFor('buyer')),
  });
  expect(ghost.status()).toBe(404);
});

test(tc('157', 'Halaman toko: jumlah pengikut tampil, guest diarahkan ke login dengan return URL'), async ({ page, request }) => {
  const shop = await pickShop(request);

  await page.goto(`/toko/${shop.slug}`);

  // Jumlah follower dirender dari server (tidak menunggu klien).
  const count = page.getByTestId('follower-count');
  await expect(count).toContainText('pengikut');

  // Guest klik Follow -> ke /masuk dengan tujuan kembali ke halaman toko.
  await page.getByTestId('follow-shop').click();
  await page.waitForURL(/\/masuk\?return=/);
  const returnParam = new URL(page.url()).searchParams.get('return');
  expect(returnParam).toBe(`/toko/${shop.slug}`);
});
