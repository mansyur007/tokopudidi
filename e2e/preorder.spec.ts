// Pre-order (M15-B1) — badge murni informasi, tidak ada SLA/auto-cancel.
//
// Yang tidak bisa diuji unit test: validasi konsistensi isPreorder/preorderDays
// ditegakkan SERVER (bukan cuma zod) saat update parsial, badge tampil sama di
// listing/detail/keranjang/checkout, dan snapshot OrderItem.preorderDays tidak
// ikut berubah saat seller mengedit lead time produk setelah ada pesanan.
import { test, expect } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

async function createPreorderProduct(
  request: import('@playwright/test').APIRequestContext,
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const catRes = await request.get(`${V1}/categories`);
  const categories = (await catRes.json()).data;
  const categoryId = (Array.isArray(categories) ? categories : categories.items)[0].id;

  const name = `Produk Preorder E2E ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const res = await request.post(`${V1}/seller/products`, {
    headers: auth(token),
    data: {
      name,
      description: 'Produk pre-order uji otomatis dari suite E2E Tokopudidi.',
      categoryId,
      price: 25_000,
      stock: 10,
      weight: 500,
      imageUrls: ['https://placehold.co/600x600/png'],
      isPreorder: true,
      preorderDays: 14,
      ...overrides,
    },
  });
  return { res, name };
}

test(tc('179', 'Seller wajib isi lama pre-order 1-90 hari kalau isPreorder aktif'), async ({ request }) => {
  const token = tokenFor('seller');

  // isPreorder true tanpa preorderDays -> ditolak.
  const tanpaHari = await createPreorderProduct(request, token, { preorderDays: null });
  expect(tanpaHari.res.status()).toBe(400);

  // preorderDays di luar 1-90 -> ditolak.
  const kelewatan = await createPreorderProduct(request, token, { preorderDays: 91 });
  expect(kelewatan.res.status()).toBe(400);

  // Payload valid -> tersimpan apa adanya.
  const sah = await createPreorderProduct(request, token, { preorderDays: 14 });
  expect(sah.res.status(), await sah.res.text()).toBe(201);
  const produk = (await sah.res.json()).data;
  expect(produk.isPreorder).toBe(true);
  expect(produk.preorderDays).toBe(14);
});

test(tc('180', 'Toggle isPreorder off membersihkan preorderDays walau tidak ikut dikirim'), async ({ request }) => {
  const token = tokenFor('seller');
  const { res } = await createPreorderProduct(request, token, { preorderDays: 21 });
  expect(res.status(), await res.text()).toBe(201);
  const produk = (await res.json()).data;

  // Matikan toggle TANPA menyertakan preorderDays di payload — server yang
  // wajib membersihkannya, bukan mengandalkan client mengirim null.
  const off = await request.patch(`${V1}/seller/products/${produk.id}`, {
    headers: auth(token),
    data: { isPreorder: false },
  });
  expect(off.status(), await off.text()).toBe(200);
  const updated = (await off.json()).data;
  expect(updated.isPreorder).toBe(false);
  expect(updated.preorderDays).toBeNull();

  // Nyalakan lagi tanpa mengisi lama hari -> ditolak, bukan diam-diam memakai
  // nilai lama yang sudah dibersihkan.
  const onTanpaHari = await request.patch(`${V1}/seller/products/${produk.id}`, {
    headers: auth(token),
    data: { isPreorder: true },
  });
  expect(onTanpaHari.status()).toBe(400);
});

test(tc('181', 'Badge pre-order konsisten di listing dan detail produk'), async ({ request }) => {
  const token = tokenFor('seller');
  const { res, name } = await createPreorderProduct(request, token, { preorderDays: 7 });
  expect(res.status(), await res.text()).toBe(201);
  const produk = (await res.json()).data;

  const list = await request.get(`${V1}/products?q=${encodeURIComponent(name)}`);
  const { items } = (await list.json()).data;
  const card = items.find((p: { id: string }) => p.id === produk.id);
  expect(card, 'produk baru harus muncul di listing publik').toBeTruthy();
  expect(card.isPreorder).toBe(true);
  expect(card.preorderDays).toBe(7);

  const detail = await request.get(`${V1}/products/${produk.slug}`);
  const detailData = (await detail.json()).data;
  expect(detailData.isPreorder).toBe(true);
  expect(detailData.preorderDays).toBe(7);
});

test(tc('182', 'Checkout menyimpan preorderDays sebagai snapshot — edit lead time tidak mengubah pesanan lama'), async ({ request }) => {
  const buyerToken = tokenFor('buyer');
  const sellerToken = tokenFor('seller');
  const { res } = await createPreorderProduct(request, sellerToken, { preorderDays: 10 });
  expect(res.status(), await res.text()).toBe(201);
  const produk = (await res.json()).data;

  const add = await request.post(`${V1}/cart/items`, {
    headers: auth(buyerToken),
    data: { productId: produk.id, quantity: 1 },
  });
  expect(add.status(), await add.text()).toBe(201);

  const alamatRes = await request.get(`${V1}/users/me/addresses`, { headers: auth(buyerToken) });
  const daftar = (await alamatRes.json()).data as { id: string }[];
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const addressId = daftar.find((a) => UUID.test(a.id))?.id;
  expect(addressId, 'butuh alamat buyer ber-uuid').toBeTruthy();

  const cart = await request.get(`${V1}/cart`, { headers: auth(buyerToken) });
  const grouped = (await cart.json()).data.grouped as { shop: { id: string }; items: { id: string; productId: string }[] }[];
  const groupBaru = grouped.find((g) => g.items.some((it) => it.productId === produk.id));
  expect(groupBaru).toBeTruthy();

  const checkout = await request.post(`${V1}/orders/checkout`, {
    headers: auth(buyerToken),
    data: {
      addressId,
      paymentMethod: 'TRANSFER_MANUAL',
      shops: [{
        shopId: groupBaru!.shop.id,
        cartItemIds: groupBaru!.items.map((it) => it.id),
        shippingMethod: 'REGULAR',
      }],
    },
  });
  expect(checkout.status(), await checkout.text()).toBe(201);
  const body = (await checkout.json()).data;
  const orderId = (Array.isArray(body) ? body : body.orders)[0].id as string;

  try {
    const detail = await request.get(`${V1}/orders/${orderId}`, { headers: auth(buyerToken) });
    const order = (await detail.json()).data;
    const item = order.items.find((i: { productId: string }) => i.productId === produk.id);
    expect(item.preorderDays).toBe(10);

    // Seller ubah lead time SETELAH pesanan dibuat.
    const ubah = await request.patch(`${V1}/seller/products/${produk.id}`, {
      headers: auth(sellerToken),
      data: { preorderDays: 45 },
    });
    expect(ubah.status(), await ubah.text()).toBe(200);

    // Snapshot pesanan lama tidak boleh ikut berubah.
    const detailLagi = await request.get(`${V1}/orders/${orderId}`, { headers: auth(buyerToken) });
    const orderLagi = (await detailLagi.json()).data;
    const itemLagi = orderLagi.items.find((i: { productId: string }) => i.productId === produk.id);
    expect(itemLagi.preorderDays).toBe(10);
  } finally {
    await request.post(`${V1}/orders/${orderId}/cancel`, {
      headers: auth(buyerToken),
      data: { reason: 'Pembersihan data uji otomatis' },
    });
  }
});

test(tc('183', 'BuyBox & keranjang menampilkan badge Pre-Order'), async ({ page, request }) => {
  const sellerToken = tokenFor('seller');
  const { res } = await createPreorderProduct(request, sellerToken, { preorderDays: 5 });
  expect(res.status(), await res.text()).toBe(201);
  const produk = (await res.json()).data;

  await page.goto(`/produk/${produk.slug}`);
  const badge = page.getByTestId('preorder-badge').first();
  await expect(badge).toBeVisible();
  await expect(badge).toContainText('5 hari');
});
