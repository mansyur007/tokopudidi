// Invoice pesanan buyer (M13-A2).
//
// Yang tidak bisa diuji unit test: dokumennya benar-benar dirender dari snapshot
// pesanan, kerangka aplikasi tidak ikut tercetak, dan pesanan yang belum dibayar
// ditolak walau URL invoice-nya dibuka langsung.
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

/**
 * Suntik sesi buyer dalam bentuk yang dipakai zustand/persist, sebelum skrip
 * halaman jalan — persis kondisi "buka bookmark". Pola yang sama dengan
 * TC-155 di admin-log.spec.ts.
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Alamat buyer yang benar-benar bisa dipakai checkout.
 *
 * **Jebakan**: alamat bawaan seed ber-id `seed-addr-budi` (id tetap supaya
 * upsert seed idempoten), sedangkan `checkoutSchema.addressId` mewajibkan
 * `z.string().uuid()` — jadi alamat itu selalu ditolak 400 "Invalid uuid".
 * Karena `isDefault` diurutkan paling atas, "ambil alamat pertama" justru
 * selalu mendapat yang tidak bisa dipakai. Itu bug data seed, bukan bug test;
 * dicatat sebagai temuan terpisah.
 */
async function checkoutableAddressId(request: APIRequestContext, token: string): Promise<string> {
  const res = await request.get(`${V1}/users/me/addresses`, { headers: auth(token) });
  expect(res.status()).toBe(200);
  const daftar = (await res.json()).data as { id: string }[];

  const pakai = daftar.find((a) => UUID.test(a.id));
  if (pakai) return pakai.id;

  const baru = await request.post(`${V1}/users/me/addresses`, {
    headers: auth(token),
    data: {
      label: 'Rumah Uji Invoice',
      recipientName: 'Pembeli E2E',
      recipientPhone: '081200000201',
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      district: 'Kebayoran Baru',
      subdistrict: 'Gandaria Utara',
      postalCode: '12140',
      fullAddress: 'Jl. Uji Invoice No. 1',
    },
  });
  expect(baru.status(), await baru.text()).toBe(201);
  return (await baru.json()).data.id as string;
}

/** Pesanan buyer yang statusnya sudah dibayar — invoice-nya wajib ada. */
async function pickPaidOrder(request: APIRequestContext) {
  const res = await request.get(`${V1}/orders?status=ALL&page=1`, { headers: auth(tokenFor('buyer')) });
  expect(res.status()).toBe(200);
  const body = (await res.json()).data;
  const orders = (Array.isArray(body) ? body : body.items) as { id: string; orderNumber: string; status: string; total: number }[];
  const paid = orders.find((o) =>
    ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(o.status),
  );
  expect(paid, 'seed butuh minimal 1 pesanan buyer yang sudah dibayar').toBeTruthy();
  return paid!;
}

test(tc('159', 'Invoice pesanan: terbuka lewat URL langsung & kerangka app tidak ikut tercetak'), async ({ page, request }) => {
  const order = await pickPaidOrder(request);
  await injectBuyerSession(page, request);

  // Tombol di detail pesanan muncul untuk pesanan yang sudah dibayar.
  await page.goto(`/pesanan/${order.id}`);
  await expect(page).toHaveURL(new RegExp(`/pesanan/${order.id}$`));
  await expect(page.getByTestId('lihat-invoice')).toBeVisible();

  await page.getByTestId('lihat-invoice').click();
  await page.waitForURL(new RegExp(`/pesanan/${order.id}/invoice$`));

  // Isi dokumen datang dari snapshot pesanan.
  await expect(page.getByText(`INV/${order.orderNumber}`)).toBeVisible();
  await expect(page.getByTestId('invoice-total')).toBeVisible();
  await expect(page.getByText('sah tanpa tanda tangan')).toBeVisible();

  // Muat ulang penuh: invoice harus tetap terbuka, bukan dibuang ke /masuk.
  // Ini regresi yang sama dengan bug guard hidrasi di shell admin/seller.
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/pesanan/${order.id}/invoice$`));
  await expect(page.getByText(`INV/${order.orderNumber}`)).toBeVisible();

  // INTI CETAKNYA: pada media print, kerangka aplikasi hilang dan hanya
  // dokumennya yang tersisa. Diperiksa lewat emulasi media, bukan dengan
  // menebak-nebak nama kelas CSS.
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByTestId('invoice-total')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeHidden();
  await expect(page.getByRole('link', { name: 'Buka chat' })).toBeHidden();
  await expect(page.getByRole('button', { name: /Cetak/ })).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
});

test(tc('160', 'Invoice ditolak untuk pesanan yang belum dibayar, termasuk lewat URL langsung'), async ({ page, request }) => {
  const token = tokenFor('buyer');

  // Pesanan PENDING_PAYMENT dibuat sendiri supaya test ini tidak bergantung
  // pada sisa run spec lain. Dibatalkan lagi di akhir — cancel mengembalikan
  // stok lewat helper `restoreStock` yang sama dengan pembatalan biasa.
  const produk = await request.get(`${V1}/products?limit=20`);
  const kartu = (await produk.json()).data.items as { id: string; slug: string }[];
  let orderId = '';

  for (const k of kartu) {
    const detail = await request.get(`${V1}/products/${k.slug}`);
    if (!detail.ok()) continue;
    const p = (await detail.json()).data;
    if (p.stock < 1) continue;
    const varian = (p.variants ?? []).find((v: { stock: number }) => v.stock > 0);
    if ((p.variants ?? []).length > 0 && !varian) continue;

    const add = await request.post(`${V1}/cart/items`, {
      headers: auth(token),
      data: { productId: p.id, ...(varian ? { variantId: varian.id } : {}), quantity: 1 },
    });
    if (!add.ok()) continue;

    const cart = await request.get(`${V1}/cart`, { headers: auth(token) });
    const grouped = (await cart.json()).data.grouped as { shop: { id: string }; items: { id: string }[] }[];
    const addressId = await checkoutableAddressId(request, token);

    const checkout = await request.post(`${V1}/orders/checkout`, {
      headers: auth(token),
      data: {
        addressId,
        // TRANSFER_MANUAL sengaja: hanya COD yang langsung berstatus PAID.
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
    expect(orders[0].status).toBe('PENDING_PAYMENT');
    orderId = orders[0].id;
    break;
  }
  expect(orderId, 'tidak ada produk berstok untuk membuat pesanan uji').toBeTruthy();

  try {
    await injectBuyerSession(page, request);

    // 1. Tombol invoice tidak muncul di detail pesanan.
    await page.goto(`/pesanan/${orderId}`);
    await expect(page.getByText('Belum Bayar')).toBeVisible();
    await expect(page.getByTestId('lihat-invoice')).toHaveCount(0);

    // 2. URL invoice dibuka langsung -> dokumennya tidak dirender.
    await page.goto(`/pesanan/${orderId}/invoice`);
    await expect(page.getByText('Invoice belum tersedia untuk pesanan ini.')).toBeVisible();
    await expect(page.getByTestId('invoice-total')).toHaveCount(0);
  } finally {
    await request.post(`${V1}/orders/${orderId}/cancel`, {
      headers: auth(token),
      data: { reason: 'Pembersihan data uji otomatis' },
    });
  }
});
