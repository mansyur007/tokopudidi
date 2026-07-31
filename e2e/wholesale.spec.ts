// Harga grosir bertingkat (M13-B1).
//
// Yang tidak bisa diuji unit test: harga tier benar-benar diterapkan server di
// keranjang dan tersimpan sebagai snapshot `OrderItem.price` saat checkout,
// serta tabel tier di BuyBox ikut bergerak saat qty diubah.
import { test, expect, type APIRequestContext } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Produk seed yang punya harga grosir (lihat packages/database/src/seed.ts). */
async function pickWholesaleProduct(request: APIRequestContext) {
  const list = await request.get(`${V1}/products?limit=50`);
  const items = (await list.json()).data.items as { slug: string }[];

  for (const card of items) {
    const res = await request.get(`${V1}/products/${card.slug}`);
    if (!res.ok()) continue;
    const p = (await res.json()).data;
    if (!p.wholesaleTiers?.length) continue;
    if (p.stock < 30) continue;
    // Produk bervarian bikin harga ikut priceModifier — di luar fokus test ini.
    if ((p.variants ?? []).length > 0) continue;
    return p;
  }
  throw new Error('Seed tidak punya produk berharga grosir — jalankan `npm run db:seed` versi terbaru.');
}

async function emptyCart(request: APIRequestContext, token: string) {
  const res = await request.get(`${V1}/cart`, { headers: auth(token) });
  const { items } = (await res.json()).data;
  for (const it of items) {
    await request.delete(`${V1}/cart/items/${it.id}`, { headers: auth(token) });
  }
}

async function cartLineFor(request: APIRequestContext, token: string, productId: string) {
  const res = await request.get(`${V1}/cart`, { headers: auth(token) });
  const { items } = (await res.json()).data;
  return items.find((i: { productId: string }) => i.productId === productId);
}

test(tc('161', 'Harga grosir diterapkan server di keranjang saat qty melewati ambang'), async ({ request }) => {
  const token = tokenFor('buyer');
  const p = await pickWholesaleProduct(request);
  const tier1 = p.wholesaleTiers[0];

  await emptyCart(request, token);

  // 1. Di bawah ambang -> harga normal.
  const add = await request.post(`${V1}/cart/items`, {
    headers: auth(token),
    data: { productId: p.id, quantity: 1 },
  });
  expect(add.status()).toBe(201);

  const sebelum = await cartLineFor(request, token, p.id);
  expect(sebelum.price).toBe(p.price);
  expect(sebelum.subtotal).toBe(p.price);

  // 2. Naikkan qty melewati ambang tier pertama -> harga satuan turun.
  //    Ini yang membuktikan harganya dihitung server, bukan cuma tampilan FE.
  const ubah = await request.patch(`${V1}/cart/items/${sebelum.id}`, {
    headers: auth(token),
    data: { quantity: tier1.minQty },
  });
  expect(ubah.status(), await ubah.text()).toBe(200);

  const sesudah = await cartLineFor(request, token, p.id);
  expect(sesudah.price).toBe(tier1.price);
  expect(sesudah.subtotal).toBe(tier1.price * tier1.minQty);
  expect(sesudah.price).toBeLessThan(p.price);

  // 3. Turunkan lagi -> kembali ke harga normal (tier tidak "lengket").
  await request.patch(`${V1}/cart/items/${sebelum.id}`, {
    headers: auth(token),
    data: { quantity: 1 },
  });
  const kembali = await cartLineFor(request, token, p.id);
  expect(kembali.price).toBe(p.price);

  await emptyCart(request, token);
});

test(tc('162', 'Checkout menyimpan harga grosir sebagai snapshot OrderItem.price'), async ({ request }) => {
  const token = tokenFor('buyer');
  const p = await pickWholesaleProduct(request);
  const tier = p.wholesaleTiers[p.wholesaleTiers.length - 1];

  await emptyCart(request, token);
  const add = await request.post(`${V1}/cart/items`, {
    headers: auth(token),
    data: { productId: p.id, quantity: tier.minQty },
  });
  expect(add.status(), await add.text()).toBe(201);

  // Alamat ber-uuid; alamat bawaan seed pernah ber-id non-uuid dan ditolak
  // checkoutSchema (lihat invoice.spec.ts / fix seed).
  const alamatRes = await request.get(`${V1}/users/me/addresses`, { headers: auth(token) });
  const daftar = (await alamatRes.json()).data as { id: string }[];
  const addressId = daftar.find((a) => UUID.test(a.id))?.id;
  expect(addressId, 'butuh alamat buyer ber-uuid').toBeTruthy();

  const cart = await request.get(`${V1}/cart`, { headers: auth(token) });
  const grouped = (await cart.json()).data.grouped as { shop: { id: string }; items: { id: string }[] }[];

  const checkout = await request.post(`${V1}/orders/checkout`, {
    headers: auth(token),
    data: {
      addressId,
      paymentMethod: 'TRANSFER_MANUAL',
      shops: grouped.map((g) => ({
        shopId: g.shop.id,
        cartItemIds: g.items.map((i) => i.id),
        shippingMethod: 'REGULAR',
      })),
    },
  });
  expect(checkout.status(), await checkout.text()).toBe(201);
  const body = (await checkout.json()).data;
  const orders = Array.isArray(body) ? body : (body.orders ?? [body]);
  const orderId = orders[0].id as string;

  try {
    const detail = await request.get(`${V1}/orders/${orderId}`, { headers: auth(token) });
    const order = (await detail.json()).data;
    const item = order.items.find((i: { productId: string }) => i.productId === p.id);
    expect(item, 'produk grosir tidak ada di pesanan').toBeTruthy();

    // Snapshot harga = harga tier, bukan harga normal.
    expect(item.price).toBe(tier.price);
    expect(item.subtotal).toBe(tier.price * tier.minQty);

    // Total order konsisten dengan jumlah itemnya — kalau rumus harga di dua
    // tempat berbeda, ketimpangannya muncul di sini.
    const jumlahItem = order.items.reduce((s: number, i: { subtotal: number }) => s + i.subtotal, 0);
    expect(order.subtotal).toBe(jumlahItem);
  } finally {
    await request.post(`${V1}/orders/${orderId}/cancel`, {
      headers: auth(token),
      data: { reason: 'Pembersihan data uji otomatis' },
    });
    await emptyCart(request, token);
  }
});

test(tc('163', 'Seller ditolak saat tier grosir tidak masuk akal'), async ({ request }) => {
  const sellerToken = tokenFor('seller');

  const daftar = await request.get(`${V1}/seller/products?limit=1`, { headers: auth(sellerToken) });
  const body = (await daftar.json()).data;
  const produk = (Array.isArray(body) ? body : body.items)[0] as { id: string; price: number };
  expect(produk, 'seed butuh minimal 1 produk milik seller').toBeTruthy();

  // Produk seller seed = toko Bu Siti, yang juga memuat produk berharga grosir
  // milik TC-161/162/164. Tier aslinya direkam dan dikembalikan di `finally`
  // supaya test ini tidak diam-diam mematikan grosir milik test lain.
  const awalRes = await request.get(`${V1}/seller/products/${produk.id}`, { headers: auth(sellerToken) });
  const tierAwal = ((await awalRes.json()).data.wholesaleTiers ?? []) as { minQty: number; price: number }[];

  const tolakan = [
    { nama: 'ambang tidak naik', tiers: [{ minQty: 10, price: 900 }, { minQty: 5, price: 800 }] },
    { nama: 'harga tidak turun', tiers: [{ minQty: 5, price: 900 }, { minQty: 10, price: 900 }] },
    { nama: 'minQty 1', tiers: [{ minQty: 1, price: 900 }] },
    { nama: 'lebih mahal dari harga normal', tiers: [{ minQty: 5, price: produk.price + 1000 }] },
  ];

  try {
    for (const kasus of tolakan) {
      const res = await request.patch(`${V1}/seller/products/${produk.id}`, {
        headers: auth(sellerToken),
        data: { wholesaleTiers: kasus.tiers },
      });
      expect(res.status(), `${kasus.nama} seharusnya ditolak`).toBe(400);
    }

    // Penolakan tidak boleh menyimpan sebagian — tier lama harus utuh.
    const setelahTolak = await request.get(`${V1}/seller/products/${produk.id}`, { headers: auth(sellerToken) });
    expect((await setelahTolak.json()).data.wholesaleTiers ?? []).toHaveLength(tierAwal.length);

    // Payload yang sah diterima.
    const sah = await request.patch(`${V1}/seller/products/${produk.id}`, {
      headers: auth(sellerToken),
      data: { wholesaleTiers: [{ minQty: 5, price: Math.max(100, produk.price - 1000) }] },
    });
    expect(sah.status(), await sah.text()).toBe(200);
    expect((await sah.json()).data.wholesaleTiers).toHaveLength(1);

    // Array kosong = matikan grosir (replace-all, tanpa endpoint terpisah).
    const bersih = await request.patch(`${V1}/seller/products/${produk.id}`, {
      headers: auth(sellerToken),
      data: { wholesaleTiers: [] },
    });
    expect(bersih.status()).toBe(200);
    expect((await bersih.json()).data.wholesaleTiers).toHaveLength(0);
  } finally {
    await request.patch(`${V1}/seller/products/${produk.id}`, {
      headers: auth(sellerToken),
      data: { wholesaleTiers: tierAwal.map((t) => ({ minQty: t.minQty, price: t.price })) },
    });
  }
});

test(tc('164', 'BuyBox menampilkan tabel grosir dan harga satuan ikut qty'), async ({ page, request }) => {
  const p = await pickWholesaleProduct(request);
  const tier1 = p.wholesaleTiers[0];

  await page.goto(`/produk/${p.slug}`);

  await expect(page.getByTestId('tabel-grosir')).toBeVisible();

  // Mulai dari minOrderQty -> harga normal.
  const hargaSatuan = page.getByTestId('harga-satuan');
  await expect(hargaSatuan).toBeVisible();

  // Naikkan qty sampai ambang tier pertama lewat tombol +.
  const tambah = page.getByRole('button', { name: 'Tambah jumlah' });
  for (let i = p.minOrderQty; i < tier1.minQty; i++) await tambah.click();

  // Harga satuan berubah jadi harga tier. Format rupiah dibandingkan lewat
  // angkanya saja supaya tidak rapuh terhadap pemisah ribuan.
  await expect(async () => {
    const teks = (await hargaSatuan.textContent()) ?? '';
    const angka = Number(teks.replace(/\D/g, ''));
    expect(angka).toBe(tier1.price);
  }).toPass({ timeout: 5_000 });
});
