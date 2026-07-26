import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { tc, V1, auth, tokenFor, pickBuyableProduct } from './helpers/testforge';

// Token dari global-setup — tidak login ulang di sini (lihat tokenFor()).
// Dibaca di beforeAll, bukan di level modul: saat `playwright test --list`
// global-setup tidak dijalankan sehingga cache-nya belum ada.
let token: string;

test.beforeAll(() => {
  token = tokenFor('buyer');
});

/** Kosongkan keranjang supaya tiap test mulai dari kondisi yang diketahui. */
async function emptyCart(request: APIRequestContext) {
  const res = await request.get(`${V1}/cart`, { headers: auth(token) });
  const { items } = (await res.json()).data;
  for (const it of items) {
    await request.delete(`${V1}/cart/items/${it.id}`, { headers: auth(token) });
  }
}

test(tc('058', 'Tambah produk ke keranjang'), async ({ request }) => {
  await emptyCart(request);
  const product = await pickBuyableProduct(request);

  // 1. POST /cart/items -> item masuk keranjang.
  const add = await request.post(`${V1}/cart/items`, {
    headers: auth(token),
    data: {
      productId: product.productId,
      ...(product.variantId ? { variantId: product.variantId } : {}),
      quantity: 2,
    },
  });
  expect(add.status()).toBe(201);

  // 2. GET /cart -> item tampil dengan subtotal.
  const cart = await request.get(`${V1}/cart`, { headers: auth(token) });
  expect(cart.status()).toBe(200);
  const data = (await cart.json()).data;

  const line = data.items.find((i: { productId: string }) => i.productId === product.productId);
  expect(line, 'produk yang baru ditambah tidak ada di keranjang').toBeTruthy();
  expect(line.quantity).toBe(2);
  expect(line.subtotal).toBe(line.price * line.quantity);
  // Keranjang dikelompokkan per toko — dasar aturan 1 toko = 1 order.
  expect(data.grouped.length).toBeGreaterThan(0);
});

test(tc('065', 'Checkout multi-toko berhasil membuat pesanan'), async ({ request }) => {
  await emptyCart(request);
  const product = await pickBuyableProduct(request);

  await request.post(`${V1}/cart/items`, {
    headers: auth(token),
    data: {
      productId: product.productId,
      ...(product.variantId ? { variantId: product.variantId } : {}),
      quantity: 1,
    },
  });

  // Alamat dibuat sendiri, tidak memakai alamat seed: id seed ('seed-addr-budi')
  // bukan UUID sehingga ditolak checkoutSchema (`addressId: z.string().uuid()`).
  const addrRes = await request.post(`${V1}/users/me/addresses`, {
    headers: auth(token),
    data: {
      label: 'E2E',
      recipientName: 'Pembeli E2E',
      recipientPhone: '081200000201',
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      district: 'Kebayoran Baru',
      subdistrict: 'Gandaria Utara',
      postalCode: '12140',
      fullAddress: 'Jl. Uji Otomatis No. 1',
    },
  });
  expect(addrRes.status()).toBe(201);
  const addressId = (await addrRes.json()).data.id;

  const cart = await request.get(`${V1}/cart`, { headers: auth(token) });
  const grouped = (await cart.json()).data.grouped;

  // 1. POST /orders/checkout -> pesanan dibuat per toko, status PENDING_PAYMENT.
  const checkout = await request.post(`${V1}/orders/checkout`, {
    headers: auth(token),
    data: {
      addressId,
      paymentMethod: 'TRANSFER_MANUAL',
      shops: grouped.map((g: { shop: { id: string }; items: { id: string }[] }) => ({
        shopId: g.shop.id,
        cartItemIds: g.items.map((i) => i.id),
        shippingMethod: 'REGULAR',
      })),
    },
  });
  expect(checkout.status()).toBe(201);
  const orders = (await checkout.json()).data;
  const list = Array.isArray(orders) ? orders : (orders.orders ?? [orders]);

  // 1 toko = 1 order.
  expect(list.length).toBe(grouped.length);
  for (const o of list) {
    expect(o.status).toBe('PENDING_PAYMENT');
    expect(o.total).toBeGreaterThan(0);
  }

  // 2. Keranjang yang dipilih dikosongkan.
  const after = await request.get(`${V1}/cart`, { headers: auth(token) });
  expect((await after.json()).data.items.length).toBe(0);
});

test(tc('077', 'Lihat daftar & detail pesanan'), async ({ request }) => {
  // 1. GET /orders -> daftar pesanan user dengan status.
  const listRes = await request.get(`${V1}/orders`, { headers: auth(token) });
  expect(listRes.status()).toBe(200);
  const body = (await listRes.json()).data;
  const orders = Array.isArray(body) ? body : body.items;

  expect(Array.isArray(orders)).toBe(true);
  expect(orders.length, 'buyer belum punya pesanan — TC-065 harus jalan lebih dulu').toBeGreaterThan(0);
  expect(orders[0].status).toBeTruthy();

  // 2. GET /orders/:id -> detail: item, alamat, status.
  const detailRes = await request.get(`${V1}/orders/${orders[0].id}`, { headers: auth(token) });
  expect(detailRes.status()).toBe(200);
  const detail = (await detailRes.json()).data;

  expect(detail.id).toBe(orders[0].id);
  expect(detail.status).toBeTruthy();
  expect(Array.isArray(detail.items)).toBe(true);
  expect(detail.items.length).toBeGreaterThan(0);
});
