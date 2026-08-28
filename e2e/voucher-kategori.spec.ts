// Voucher ber-scope kategori (M9-C1).
//
// Inti yang diuji: diskon dihitung dari **item yang berhak saja**. Voucher
// kategori yang memotong seluruh subtotal keranjang bukan sekadar salah angka —
// ia memberi potongan atas barang yang tidak pernah masuk promo.
import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

const KODE = 'SEMBAKO10'; // seed: 10% khusus kategori Sembako, maks 20.000

let token: string;

test.beforeAll(() => {
  token = tokenFor('buyer');
});

async function kosongkanKeranjang(request: APIRequestContext) {
  const res = await request.get(`${V1}/cart`, { headers: auth(token) });
  for (const it of (await res.json()).data.items) {
    await request.delete(`${V1}/cart/items/${it.id}`, { headers: auth(token) });
  }
}

type Produk = { id: string; price: number };

/** Satu produk dari kategori tertentu. Memakai filter server, bukan menyaring
 *  hasil listing: kartu produk sengaja tidak membawa `categoryId`. */
async function produkDiKategori(request: APIRequestContext, categoryId: string): Promise<Produk | undefined> {
  const res = await request.get(`${V1}/products?categoryId=${categoryId}&limit=1`);
  return (await res.json()).data.items[0];
}

/** Satu produk dari kategori mana pun SELAIN yang diberikan. */
async function produkLuarKategori(
  request: APIRequestContext,
  categoryId: string,
  semua: Array<{ id: string }>,
): Promise<Produk | undefined> {
  for (const c of semua) {
    if (c.id === categoryId) continue;
    const p = await produkDiKategori(request, c.id);
    if (p) return p;
  }
  return undefined;
}

async function kategoriSembako(request: APIRequestContext) {
  const res = await request.get(`${V1}/categories`);
  const semua = (await res.json()).data as Array<{ id: string; slug: string }>;
  const sembako = semua.find((c) => c.slug === 'sembako');
  expect(sembako, 'kategori sembako tidak ada di DB ini').toBeTruthy();
  return { sembako: sembako!, semua };
}

test(tc('195', 'Voucher kategori hanya memotong item kategori itu'), async ({ request }) => {
  const { sembako, semua } = await kategoriSembako(request);

  await kosongkanKeranjang(request);

  const dalam = await produkDiKategori(request, sembako.id);
  const luar = await produkLuarKategori(request, sembako.id, semua);
  expect(dalam, 'tidak ada produk kategori sembako').toBeTruthy();
  expect(luar, 'tidak ada produk di luar kategori sembako').toBeTruthy();

  await request.post(`${V1}/cart/items`, {
    headers: auth(token),
    data: { productId: dalam!.id, quantity: 1 },
  });
  await request.post(`${V1}/cart/items`, {
    headers: auth(token),
    data: { productId: luar!.id, quantity: 1 },
  });

  // Angka `subtotal` yang dikirim klien sengaja dibuat ngawur (seluruh keranjang
  // + jauh lebih besar). Server harus mengabaikannya dan memakai subtotal
  // kategori dari keranjang — kalau tidak, diskonnya bisa dikarang klien.
  const validate = await request.post(`${V1}/promo/validate`, {
    headers: auth(token),
    data: { code: KODE, subtotal: 99_000_000 },
  });
  expect(validate.status()).toBe(200);
  const hasil = (await validate.json()).data;

  const diskonSeharusnya = Math.min(Math.floor((dalam!.price * 10) / 100), 20000);
  expect(hasil.discountAmount).toBe(diskonSeharusnya);

  // Yang membuktikan scope-nya bekerja: diskon **lebih kecil** daripada 10%
  // seluruh keranjang. Tanpa perbandingan ini, implementasi yang mendiskon
  // semua item tetap bisa lolos kalau kebetulan harga keduanya mirip.
  const diskonSeluruhKeranjang = Math.min(
    Math.floor(((dalam!.price + luar!.price) * 10) / 100),
    20000,
  );
  expect(diskonSeluruhKeranjang, 'harga uji tidak membedakan kedua skenario').toBeGreaterThan(diskonSeharusnya);
  expect(hasil.discountAmount).toBeLessThan(diskonSeluruhKeranjang);
});

test(tc('196', 'Voucher kategori ditolak kalau kategorinya tidak ada di keranjang'), async ({ request }) => {
  const { sembako, semua } = await kategoriSembako(request);

  await kosongkanKeranjang(request);
  const luar = await produkLuarKategori(request, sembako.id, semua);
  expect(luar).toBeTruthy();
  await request.post(`${V1}/cart/items`, {
    headers: auth(token),
    data: { productId: luar!.id, quantity: 1 },
  });

  const validate = await request.post(`${V1}/promo/validate`, {
    headers: auth(token),
    data: { code: KODE, subtotal: luar!.price },
  });
  expect(validate.status()).toBe(400);
  // Sebabnya harus soal kategori, bukan "kode tidak valid" — kalau vouchernya
  // hilang dari seed, test ini WAJIB merah, bukan lolos karena sama-sama 400.
  expect((await validate.json()).message).toMatch(/kategori/i);
});

test(tc('197', 'Checkout dengan voucher kategori hanya mendiskon order yang berhak'), async ({ request }) => {
  const { sembako } = await kategoriSembako(request);

  await kosongkanKeranjang(request);
  const dalam = await produkDiKategori(request, sembako.id);
  expect(dalam).toBeTruthy();
  await request.post(`${V1}/cart/items`, {
    headers: auth(token),
    data: { productId: dalam!.id, quantity: 1 },
  });

  const addr = await request.post(`${V1}/users/me/addresses`, {
    headers: auth(token),
    data: {
      label: 'E2E Voucher',
      recipientName: 'Pembeli E2E',
      recipientPhone: '081200000201',
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      district: 'Kebayoran Baru',
      subdistrict: 'Gandaria Utara',
      postalCode: '12140',
      fullAddress: 'Jl. Uji Voucher No. 1',
    },
  });
  const addressId = (await addr.json()).data.id;
  const grouped = (await (await request.get(`${V1}/cart`, { headers: auth(token) })).json()).data.grouped;

  const checkout = await request.post(`${V1}/orders/checkout`, {
    headers: auth(token),
    data: {
      addressId,
      paymentMethod: 'TRANSFER_MANUAL',
      promoCode: KODE,
      shops: grouped.map((g: { shop: { id: string }; items: { id: string }[] }) => ({
        shopId: g.shop.id,
        cartItemIds: g.items.map((i) => i.id),
        shippingMethod: 'REGULAR',
      })),
    },
  });
  expect(checkout.status(), `checkout ditolak: ${JSON.stringify(await checkout.json())}`).toBe(201);

  const data = (await checkout.json()).data;
  const order = (Array.isArray(data) ? data : (data.orders ?? [data]))[0];

  expect(order.promoCode).toBe(KODE);
  expect(order.discountAmount).toBeGreaterThan(0);
  // Total harus tetap konsisten dengan komponennya — diskon yang "muncul" tanpa
  // ikut mengubah total adalah bug yang tidak terlihat di UI mana pun.
  expect(order.total).toBe(order.subtotal + order.shippingCost - order.discountAmount);
});
