// Etalase toko (M11-B1). Menutup jalur yang butuh DB: kepemilikan produk saat
// assign, etalase kosong disembunyikan dari buyer, dan slug yang tetap stabil
// setelah rename.
import { test, expect } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

/** Bersihkan etalase sisa run sebelumnya supaya batas 10 per toko tidak kepenuhan. */
async function cleanup(request: import('@playwright/test').APIRequestContext, token: string) {
  const res = await request.get(`${V1}/seller/showcase`, { headers: auth(token) });
  const items = (await res.json()).data as { id: string; name: string }[];
  for (const it of items) {
    if (it.name.startsWith('E2E ')) {
      await request.delete(`${V1}/seller/showcase/${it.id}`, { headers: auth(token) });
    }
  }
}

test(tc('125', 'Seller kelola etalase: buat, isi produk, tampil di halaman toko'), async ({ request }) => {
  const token = tokenFor('seller');
  await cleanup(request, token);

  const shopRes = await request.get(`${V1}/seller/shop`, { headers: auth(token) });
  const shop = (await shopRes.json()).data as { id: string; slug: string };
  const shopSlug = shop.slug;

  // 1. Buat etalase.
  const name = `E2E Etalase ${Date.now()}`;
  const create = await request.post(`${V1}/seller/showcase`, {
    headers: auth(token),
    data: { name },
  });
  expect(create.status()).toBe(201);
  const showcase = (await create.json()).data;
  expect(showcase.slug).toBeTruthy();

  // 2. Etalase masih kosong -> belum muncul ke buyer.
  const publicEmpty = await request.get(`${V1}/shops/${shopSlug}`);
  expect(publicEmpty.status()).toBe(200);
  const shopEmpty = (await publicEmpty.json()).data;
  expect(shopEmpty.showcases.some((s: { id: string }) => s.id === showcase.id)).toBe(false);

  // 3. Isi dengan produk milik toko sendiri. Sengaja diambil dari katalog publik
  //    (sudah tersaring aktif + berstok) supaya jumlah yang tampil ke buyer
  //    pasti sama dengan yang di-assign — tidak bergantung isi seed.
  const prodRes = await request.get(`${V1}/products?shopId=${shop.id}&limit=3`);
  const products = (await prodRes.json()).data.items as { id: string }[];
  expect(products.length, 'seed produk toko seller kosong').toBeGreaterThan(0);
  const productIds = products.map((p) => p.id);

  const assign = await request.post(`${V1}/seller/showcase/${showcase.id}/products`, {
    headers: auth(token),
    data: { productIds },
  });
  expect(assign.status()).toBe(200);
  expect((await assign.json()).data.count).toBe(productIds.length);

  // 4. Sekarang etalase muncul di halaman toko, dengan jumlah produk tampil.
  const publicFilled = await request.get(`${V1}/shops/${shopSlug}`);
  const shopFilled = (await publicFilled.json()).data;
  const listed = shopFilled.showcases.find((s: { id: string }) => s.id === showcase.id);
  expect(listed, 'etalase berisi produk harus tampil ke buyer').toBeTruthy();
  expect(listed.productCount).toBe(productIds.length);

  // 5. Endpoint produk per etalase mengembalikan kartu produk yang benar.
  const listing = await request.get(`${V1}/shops/${shopSlug}/showcase/${showcase.slug}`);
  expect(listing.status()).toBe(200);
  const data = (await listing.json()).data;
  expect(data.showcase.slug).toBe(showcase.slug);
  expect(data.items.length).toBe(listed.productCount);
  // Bentuk kartu sama dengan listing lain (harga efektif M9-B3 sudah dihitung).
  expect(typeof data.items[0].price).toBe('number');
  expect(data.items[0].shop?.slug).toBe(shopSlug);

  // 6. Rename tidak mengubah slug — tautan yang sudah dibagikan tetap hidup.
  const renamed = `${name} (diubah)`;
  const update = await request.put(`${V1}/seller/showcase/${showcase.id}`, {
    headers: auth(token),
    data: { name: renamed },
  });
  expect(update.status()).toBe(200);
  expect((await update.json()).data.slug).toBe(showcase.slug);

  const afterRename = await request.get(`${V1}/shops/${shopSlug}/showcase/${showcase.slug}`);
  expect(afterRename.status()).toBe(200);
  expect((await afterRename.json()).data.showcase.name).toBe(renamed);

  // 7. Kosongkan etalase -> hilang lagi dari halaman toko.
  const empty = await request.post(`${V1}/seller/showcase/${showcase.id}/products`, {
    headers: auth(token),
    data: { productIds: [] },
  });
  expect(empty.status()).toBe(200);
  const publicAgain = await request.get(`${V1}/shops/${shopSlug}`);
  const shopAgain = (await publicAgain.json()).data;
  expect(shopAgain.showcases.some((s: { id: string }) => s.id === showcase.id)).toBe(false);

  // 8. Hapus etalase.
  const del = await request.delete(`${V1}/seller/showcase/${showcase.id}`, { headers: auth(token) });
  expect(del.status()).toBe(200);
});

test(tc('126', 'Etalase menolak produk milik toko lain'), async ({ request }) => {
  const token = tokenFor('seller');
  await cleanup(request, token);

  const create = await request.post(`${V1}/seller/showcase`, {
    headers: auth(token),
    data: { name: `E2E Guard ${Date.now()}` },
  });
  expect(create.status()).toBe(201);
  const showcase = (await create.json()).data;

  const shopRes = await request.get(`${V1}/seller/shop`, { headers: auth(token) });
  const myShopSlug = (await shopRes.json()).data.slug as string;

  // Payload sengaja dicampur: satu produk sendiri + satu milik toko lain, untuk
  // membuktikan penolakannya utuh (bukan menyimpan yang valid saja).
  const catalog = await request.get(`${V1}/products?limit=50`);
  const all = (await catalog.json()).data.items as { id: string; shop: { slug: string } }[];
  const mine = all.find((p) => p.shop.slug === myShopSlug);
  const foreign = all.find((p) => p.shop.slug !== myShopSlug);
  expect(mine, 'seed butuh produk milik toko seller').toBeTruthy();
  expect(foreign, 'seed butuh minimal 2 toko untuk menguji kepemilikan').toBeTruthy();

  // 1. Payload berisi produk toko lain -> 403.
  const bad = await request.post(`${V1}/seller/showcase/${showcase.id}/products`, {
    headers: auth(token),
    data: { productIds: [mine!.id, foreign!.id] },
  });
  expect(bad.status()).toBe(403);

  // 2. Tidak ada yang tersimpan sebagian — etalase tetap kosong.
  const detail = await request.get(`${V1}/seller/showcase/${showcase.id}`, { headers: auth(token) });
  expect((await detail.json()).data.products.length).toBe(0);

  await request.delete(`${V1}/seller/showcase/${showcase.id}`, { headers: auth(token) });
});

test(tc('127', 'Etalase tidak bisa diakses tanpa peran seller'), async ({ request }) => {
  // Buyer tidak punya toko -> endpoint seller ditolak.
  const buyerToken = tokenFor('buyer');
  const res = await request.get(`${V1}/seller/showcase`, { headers: auth(buyerToken) });
  expect([403, 404]).toContain(res.status());

  // Tanpa token sama sekali -> 401.
  const anon = await request.get(`${V1}/seller/showcase`);
  expect(anon.status()).toBe(401);
});

test(tc('128', 'Etalase yang tidak ada mengembalikan 404'), async ({ request }) => {
  const shops = await request.get(`${V1}/shops/featured`);
  const shop = (await shops.json()).data[0] as { slug: string } | undefined;
  expect(shop, 'seed butuh minimal 1 toko featured').toBeTruthy();

  const res = await request.get(`${V1}/shops/${shop!.slug}/showcase/etalase-yang-pasti-tidak-ada`);
  expect(res.status()).toBe(404);
});
