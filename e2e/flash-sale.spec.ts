// Flash sale terjadwal (M15-C1).
//
// Yang tidak bisa dibuktikan unit test: harga flash benar-benar sampai ke
// keranjang & pesanan lewat jalur yang sama dengan yang dilihat pembeli, kuota
// dipotong lalu dikembalikan lagi saat pesanan batal, dan aturan admin
// (harga di bawah normal, tumpang tindih antar event) ditegakkan di route —
// bukan cuma di form.
import { test, expect, request as apiRequest, type APIRequestContext } from '@playwright/test';
import { tc, V1, WEB_URL, auth, tokenFor, randomPhone } from './helpers/testforge';

const ADMIN_FS = `${V1}/admin/flash-sales`;

interface FlashItem {
  id: string;
  salePrice: number;
  quota: number;
  soldCount: number;
  remaining: number;
  product: { id: string; slug: string; price: number; originalPrice: number | null; discountPct: number | null };
}

async function eventBerjalan(request: APIRequestContext) {
  const res = await request.get(`${V1}/flash-sales/active`);
  expect(res.status()).toBe(200);
  return (await res.json()).data as
    | { id: string; name: string; endAt: string; items: FlashItem[] }
    | null;
}

async function kosongkanKeranjang(request: APIRequestContext, token: string) {
  const res = await request.get(`${V1}/cart`, { headers: auth(token) });
  const items = (await res.json()).data.items as { id: string }[];
  for (const it of items) {
    await request.delete(`${V1}/cart/items/${it.id}`, { headers: auth(token) });
  }
}

/**
 * Kumpulan productId yang sudah ikut event mana pun yang periodenya bertabrakan
 * dengan [mulai, selesai]. Definisi tumpang tindihnya sengaja disalin persis
 * dari `cariTumpangTindih` di admin.flashSale.routes.ts (`startAt < endAt lawan
 * && endAt > startAt lawan`) — kalau test dan server beda tafsir soal batas,
 * test ini akan memilih produk yang tetap ditolak server dan gagal lagi.
 */
async function produkDiEventBertabrakan(
  request: APIRequestContext,
  token: string,
  mulai: Date,
  selesai: Date,
) {
  const res = await request.get(ADMIN_FS, { headers: auth(token) });
  expect(res.status()).toBe(200);
  const events = (await res.json()).data as { id: string; startAt: string; endAt: string }[];

  const ids = new Set<string>();
  for (const ev of events) {
    if (!(new Date(ev.startAt) < selesai && new Date(ev.endAt) > mulai)) continue;
    const detail = await request.get(`${ADMIN_FS}/${ev.id}`, { headers: auth(token) });
    expect(detail.status()).toBe(200);
    for (const it of (await detail.json()).data.items as { productId: string }[]) {
      ids.add(it.productId);
    }
  }
  return ids;
}

test(tc('174', 'Flash sale berjalan tampil dengan harga & sisa kuota, dan kartunya konsisten dengan listing'), async ({ request }) => {
  const event = await eventBerjalan(request);
  expect(event, 'seed butuh flash sale berjalan — jalankan `npm run db:seed` terbaru').toBeTruthy();
  expect(event!.items.length).toBeGreaterThan(0);

  const item = event!.items[0];
  // Harga kartu = harga flash, dengan harga coret & persen diskon terisi.
  // Kalau ini meleset, pembeli melihat angka yang bukan yang akan ditagih.
  expect(item.product.price).toBe(item.salePrice);
  expect(item.product.originalPrice).not.toBeNull();
  expect(item.product.price).toBeLessThan(item.product.originalPrice!);
  expect(item.product.discountPct).toBeGreaterThan(0);
  expect(item.remaining).toBe(item.quota - item.soldCount);

  // Produk yang sama di listing umum harus berharga sama. Inilah yang dijaga
  // `applyFlashPrices`: satu produk tidak boleh punya dua harga di dua halaman.
  const listing = await request.get(`${V1}/products?limit=50`);
  const cards = (await listing.json()).data.items as { id: string; price: number }[];
  const diListing = cards.find((c) => c.id === item.product.id);
  if (diListing) {
    expect(diListing.price, 'harga di listing harus sama dengan di section flash sale').toBe(item.salePrice);
  }

  // Halaman detail mengirim bahan mentahnya, bukan hasil — supaya FE memakai
  // helper yang sama dengan server.
  const detail = await request.get(`${V1}/products/${item.product.slug}`);
  const p = (await detail.json()).data;
  expect(p.flashPrice).toBe(item.salePrice);
  expect(p.flashEndAt).toBeTruthy();
});

test(tc('175', 'Harga flash ikut ke keranjang & pesanan, kuota dipotong lalu kembali saat pesanan dibatalkan'), async ({ request }) => {
  const token = tokenFor('buyer');
  const event = await eventBerjalan(request);
  expect(event).toBeTruthy();

  // Produk flash tanpa varian — checkout menolak produk bervarian tanpa variantId.
  let target: FlashItem | undefined;
  for (const it of event!.items) {
    if (it.remaining < 1) continue;
    const d = await request.get(`${V1}/products/${it.product.slug}`);
    const p = (await d.json()).data;
    if ((p.variants ?? []).length === 0 && p.stock > 0) { target = it; break; }
  }
  expect(target, 'butuh produk flash tanpa varian & berstok').toBeTruthy();

  const kuotaSebelum = target!.remaining;

  await kosongkanKeranjang(request, token);
  const tambah = await request.post(`${V1}/cart/items`, {
    headers: auth(token),
    data: { productId: target!.product.id, quantity: 1 },
  });
  expect(tambah.status()).toBe(201);

  // Keranjang harus sudah memakai harga flash — bukan kejutan di halaman bayar.
  const cart = await request.get(`${V1}/cart`, { headers: auth(token) });
  const cartItem = (await cart.json()).data.items.find(
    (i: { productId: string }) => i.productId === target!.product.id,
  );
  expect(cartItem.price, 'harga keranjang harus harga flash').toBe(target!.salePrice);

  const alamatRes = await request.get(`${V1}/users/me/addresses`, { headers: auth(token) });
  const alamat = (await alamatRes.json()).data[0];
  expect(alamat, 'buyer seed butuh alamat').toBeTruthy();

  const checkout = await request.post(`${V1}/orders/checkout`, {
    headers: auth(token),
    data: {
      addressId: alamat.id,
      paymentMethod: 'TRANSFER_MANUAL',
      shops: [{ shopId: cartItem.shop.id, cartItemIds: [cartItem.id], shippingMethod: 'REGULAR' }],
    },
  });
  expect(checkout.status()).toBe(201);
  const { orders } = (await checkout.json()).data as {
    orders: { id: string; subtotal: number; items: { price: number; quantity: number }[] }[];
  };
  const order = orders[0];

  // Snapshot harga di pesanan = harga flash, dan subtotal-nya konsisten dengan
  // itemnya (bukti harga dihitung sekali, bukan dua kali dengan rumus berbeda —
  // sejak M15-C1 harga bisa berubah di dalam transaksi kalau kuota keburu
  // diambil orang lain, jadi kedua angka itu wajib berasal dari sumber sama).
  expect(order.items[0].price).toBe(target!.salePrice);
  expect(order.subtotal).toBe(order.items.reduce((s, i) => s + i.price * i.quantity, 0));

  // Kuota terpotong tepat sebanyak yang dibeli.
  const sesudahBeli = await eventBerjalan(request);
  const slotSesudah = sesudahBeli!.items.find((i) => i.id === target!.id);
  expect(slotSesudah!.remaining, 'kuota harus berkurang 1').toBe(kuotaSebelum - 1);

  // Batalkan → kuota kembali. Ini titik yang sama dengan pengembalian stok,
  // jadi sekaligus membuktikan pelepasannya menumpang di `restoreStock`.
  const batal = await request.post(`${V1}/orders/${order.id}/cancel`, {
    headers: auth(token),
    data: { reason: 'Uji otomatis pelepasan kuota flash sale' },
  });
  expect(batal.status()).toBe(200);

  const sesudahBatal = await eventBerjalan(request);
  const slotPulih = sesudahBatal!.items.find((i) => i.id === target!.id);
  expect(slotPulih!.remaining, 'kuota harus kembali setelah pesanan dibatalkan').toBe(kuotaSebelum);
});

test(tc('176', 'Admin flash sale: harga wajib di bawah harga normal, dan produk tidak bisa ikut dua event yang bertabrakan'), async ({ request }) => {
  const token = tokenFor('admin');

  // Hanya admin. Endpoint ini mengubah harga yang ditagih ke pembeli.
  expect((await request.get(ADMIN_FS)).status()).toBe(401);
  expect((await request.get(ADMIN_FS, { headers: auth(tokenFor('buyer')) })).status()).toBe(403);

  const mulai = new Date(Date.now() + 60 * 60 * 1000);
  const selesai = new Date(Date.now() + 3 * 60 * 60 * 1000);

  const buat = await request.post(ADMIN_FS, {
    headers: auth(token),
    data: { name: 'E2E Flash Sale Sementara', startAt: mulai.toISOString(), endAt: selesai.toISOString() },
  });
  expect(buat.status()).toBe(201);
  const eventId = (await buat.json()).data.id as string;

  try {
    // Periode terbalik ditolak.
    const terbalik = await request.post(ADMIN_FS, {
      headers: auth(token),
      data: { name: 'E2E Periode Terbalik', startAt: selesai.toISOString(), endAt: mulai.toISOString() },
    });
    expect(terbalik.status()).toBe(400);

    // Produk uji dipilih dengan syarat eksplisit, bukan `items[0]` dari listing
    // umum. `items[0]` membuat test ini bergantung nasib lewat dua jalur, dan
    // keduanya sudah pernah menggigit — TC-176 gagal di `main` 2026-08-06 dengan
    // 422 di penambahan yang seharusnya sah, sementara run PR-nya hijau:
    //
    //   1. Produk yang sedang ikut flash sale IKUT muncul di listing umum (itu
    //      justru yang dijaga TC-174). Kalau yang terpilih salah satunya, event
    //      seed yang sedang berjalan bertabrakan dengan periode di sini, dan
    //      penambahan "sah" di bawah ditolak aturan tumpang tindih.
    //   2. Produk yang sedang diskon (M9-B3) membuat `price` di kartu adalah
    //      harga efektif, sedangkan server membandingkan dengan harga normal di
    //      DB — jadi assertion "kemahalan" di atas justru TIDAK jadi 422.
    //
    // Tujuh spec lain membuat produk baru, jadi siapa yang di posisi pertama
    // berubah antar run dan antar urutan paralel: gagalnya jarang, bukan tidak ada.
    const terpakai = await produkDiEventBertabrakan(request, token, mulai, selesai);
    const listing = await request.get(`${V1}/products?limit=50`);
    const kandidat = (await listing.json()).data.items as {
      id: string;
      price: number;
      originalPrice: number | null;
      discountPct: number | null;
    }[];
    // price > 2000 supaya `price - 1000` tetap potongan yang berarti dan tidak
    // terjepit lantai Rp 100 di bawah.
    const produk = kandidat.find(
      (p) => !terpakai.has(p.id) && !p.originalPrice && !p.discountPct && p.price > 2000,
    );
    expect(
      produk,
      'butuh 1 produk tanpa diskon, berharga > Rp 2.000, dan belum ikut event yang bertabrakan',
    ).toBeTruthy();

    // Harga flash >= harga normal bukan promo — 422, bukan diam-diam disimpan.
    const kemahalan = await request.post(`${ADMIN_FS}/${eventId}/items`, {
      headers: auth(token),
      data: { productId: produk!.id, salePrice: produk!.price, quota: 5 },
    });
    expect(kemahalan.status()).toBe(422);

    const sah = await request.post(`${ADMIN_FS}/${eventId}/items`, {
      headers: auth(token),
      data: { productId: produk!.id, salePrice: Math.max(100, produk!.price - 1000), quota: 5 },
    });
    // Pesan server ikut dibawa: kegagalan yang menggigit di `main` cuma berbunyi
    // "Expected 201, received 422" — dua aturan berbeda menghasilkan 422 di route
    // ini, jadi status saja tidak cukup untuk tahu yang mana yang menolak.
    expect(sah.status(), `penambahan sah ditolak: ${await sah.text()}`).toBe(201);

    // Produk yang sama, event lain, periode bertabrakan → ditolak. Kalau lolos,
    // `resolveFlashPrices` harus menebak harga mana yang berlaku.
    const eventLain = await request.post(ADMIN_FS, {
      headers: auth(token),
      data: {
        name: 'E2E Flash Sale Tumpang Tindih',
        startAt: new Date(mulai.getTime() + 30 * 60 * 1000).toISOString(),
        endAt: new Date(selesai.getTime() + 30 * 60 * 1000).toISOString(),
      },
    });
    expect(eventLain.status()).toBe(201);
    const eventLainId = (await eventLain.json()).data.id as string;

    try {
      const bentrok = await request.post(`${ADMIN_FS}/${eventLainId}/items`, {
        headers: auth(token),
        data: { productId: produk!.id, salePrice: Math.max(100, produk!.price - 2000), quota: 5 },
      });
      expect(bentrok.status(), 'produk yang sama di dua event yang periodenya bertabrakan harus ditolak').toBe(422);
    } finally {
      await request.delete(`${ADMIN_FS}/${eventLainId}`, { headers: auth(token) });
    }

    // Event terjadwal (belum mulai) tidak boleh bocor ke pembeli.
    const aktif = await eventBerjalan(request);
    expect(aktif?.id, 'event yang belum mulai tidak boleh jadi event berjalan').not.toBe(eventId);
  } finally {
    await request.delete(`${ADMIN_FS}/${eventId}`, { headers: auth(token) });
  }
});

test(tc('177', 'Halaman flash sale merender event berjalan beserta hitungan mundurnya'), async ({ page, request }) => {
  const event = await eventBerjalan(request);
  expect(event).toBeTruthy();

  await page.goto(`${WEB_URL}/flash-sale`);
  const section = page.getByTestId('flash-sale-section');
  await expect(section).toBeVisible();
  await expect(section).toContainText(event!.name);

  // Hitungan mundur — bukti tenggatnya benar-benar dirender, bukan hanya
  // judulnya. Bagian "N hari" opsional: event pendek berhenti di HH:MM:SS,
  // yang panjang WAJIB memakainya (tanpa itu event tujuh hari dirender
  // "165:30:47", dan bentuk itulah yang dulu lolos sampai test ini).
  await expect(section.locator('span[aria-label^="Berakhir dalam"]').first())
    .toHaveText(/^(\d+ hari )?\d{2}:\d{2}:\d{2}$/);

  // Bar kuota per produk. Jumlahnya harus sama dengan jumlah slot yang dikirim
  // API — kalau ada yang tidak dirender, pembeli tidak tahu sisa kuotanya.
  await expect(section.locator('[role="progressbar"]')).toHaveCount(event!.items.length);
});

/**
 * Balapan kuota terakhir — inti keamanan fitur ini.
 *
 * Sengaja e2e, bukan unit test: yang diuji adalah jaminan atomik Postgres
 * (`soldCount + qty <= quota` dievaluasi di baris yang sama dengan
 * penulisannya). Rencana menyebut "pola payment.test.ts", tapi berkas itu
 * justru dibuat khusus untuk bagian yang TIDAK bergantung DB — menirunya di
 * sini berarti menguji tiruan penjaganya, bukan penjaganya.
 */
const EVENT_BALAPAN = 'E2E Balapan Kuota Terakhir';

test(tc('178', 'Dua checkout paralel memperebutkan kuota terakhir: tepat satu dapat harga flash, keduanya tetap berhasil'), async ({ request }) => {
  const adminToken = tokenFor('admin');
  const buyerA = tokenFor('buyer');

  // Produk tanpa varian, berstok cukup, dan belum ikut event berjalan mana pun.
  const berjalan = await eventBerjalan(request);
  const sudahIkut = new Set((berjalan?.items ?? []).map((i) => i.product.id));
  const katalog = await request.get(`${V1}/products?limit=50`);
  const cards = (await katalog.json()).data.items as { id: string; slug: string; price: number }[];

  let produk: { id: string; slug: string; price: number } | undefined;
  for (const c of cards) {
    if (sudahIkut.has(c.id)) continue;
    const d = await request.get(`${V1}/products/${c.slug}`);
    const p = (await d.json()).data;
    if ((p.variants ?? []).length === 0 && p.stock >= 2 && p.wholesaleTiers.length === 0) {
      produk = { id: p.id, slug: p.slug, price: p.price };
      break;
    }
  }
  expect(produk, 'butuh produk tanpa varian/grosir, stok >= 2, di luar event berjalan').toBeTruthy();

  const hargaFlash = Math.max(100, produk!.price - 3_000);
  const periode = {
    startAt: new Date(Date.now() - 60_000).toISOString(),
    endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  };

  // Cari-atau-buat. Event ini TIDAK bisa dihapus setelah dipakai (baris pesanan
  // menunjuk slotnya — itu memang aturannya), jadi run berikutnya memakai ulang
  // event yang sama daripada menabraknya sebagai tumpang tindih.
  const daftar = await request.get(ADMIN_FS, { headers: auth(adminToken) });
  const adaEvent = ((await daftar.json()).data as { id: string; name: string }[])
    .find((e) => e.name === EVENT_BALAPAN);

  let eventId: string;
  if (adaEvent) {
    eventId = adaEvent.id;
    const hidup = await request.put(`${ADMIN_FS}/${eventId}`, {
      headers: auth(adminToken), data: { ...periode, isActive: true },
    });
    expect(hidup.status()).toBe(200);
    const detail = await request.get(`${ADMIN_FS}/${eventId}`, { headers: auth(adminToken) });
    const slot = (await detail.json()).data.items[0] as { id: string };
    const setel = await request.put(`${ADMIN_FS}/${eventId}/items/${slot.id}`, {
      headers: auth(adminToken), data: { quota: 1, salePrice: hargaFlash },
    });
    expect(setel.status()).toBe(200);
  } else {
    const buat = await request.post(ADMIN_FS, {
      headers: auth(adminToken), data: { name: EVENT_BALAPAN, ...periode },
    });
    expect(buat.status()).toBe(201);
    eventId = (await buat.json()).data.id;
    const slot = await request.post(`${ADMIN_FS}/${eventId}/items`, {
      headers: auth(adminToken),
      data: { productId: produk!.id, salePrice: hargaFlash, quota: 1 },
    });
    expect(slot.status()).toBe(201);
  }

  // Pembeli kedua: kuota terakhir hanya bisa diperebutkan oleh dua keranjang
  // berbeda, dan satu akun tidak bisa punya dua baris untuk produk yang sama.
  const daftarB = await request.post(`${V1}/auth/register`, {
    data: { fullName: 'Pembeli Balapan E2E', phone: randomPhone(), password: 'rahasia123' },
  });
  expect(daftarB.status()).toBe(201);
  const buyerB = (await daftarB.json()).data.tokens.accessToken as string;

  const alamatB = await request.post(`${V1}/users/me/addresses`, {
    headers: auth(buyerB),
    data: {
      label: 'Rumah', recipientName: 'Pembeli Balapan E2E', recipientPhone: '081299999999',
      province: 'DKI Jakarta', city: 'Jakarta Selatan', district: 'Tebet',
      subdistrict: 'Tebet Barat', postalCode: '12810',
      fullAddress: 'Jalan Uji Otomatis No. 1', isDefault: true,
    },
  });
  expect(alamatB.status()).toBe(201);

  async function siapkanCheckout(token: string) {
    await kosongkanKeranjang(request, token);
    const tambah = await request.post(`${V1}/cart/items`, {
      headers: auth(token), data: { productId: produk!.id, quantity: 1 },
    });
    expect(tambah.status()).toBe(201);
    const cart = await request.get(`${V1}/cart`, { headers: auth(token) });
    const item = (await cart.json()).data.items[0];
    const alamat = await request.get(`${V1}/users/me/addresses`, { headers: auth(token) });
    const addressId = (await alamat.json()).data[0].id;
    return {
      addressId,
      paymentMethod: 'TRANSFER_MANUAL' as const,
      shops: [{ shopId: item.shop.id, cartItemIds: [item.id], shippingMethod: 'REGULAR' as const }],
    };
  }

  // Slot harus berangkat dari kuota utuh. Kalau run sebelumnya mati di
  // tengah jalan, pesanannya tidak sempat dibatalkan dan `soldCount`-nya
  // tertinggal — test ini akan tampak gagal karena hal yang tidak diujinya.
  const awal = await request.get(`${ADMIN_FS}/${eventId}`, { headers: auth(adminToken) });
  expect(
    ((await awal.json()).data.items[0] as { soldCount: number }).soldCount,
    `slot "${EVENT_BALAPAN}" masih memegang penjualan run sebelumnya — batalkan pesanannya atau jalankan ulang \`npm run db:seed\` di DB segar`,
  ).toBe(0);

  // ── Bagian 1 (deterministik): permintaan yang MELEBIHI kuota dalam satu
  // baris. Ini menguji aritmetika penjaganya tanpa bergantung waktu sama
  // sekali — `soldCount + 2 <= 1` salah, jadi barisnya harus jatuh ke harga
  // normal dan kuotanya tidak boleh tersentuh.
  await kosongkanKeranjang(request, buyerA);
  await request.post(`${V1}/cart/items`, {
    headers: auth(buyerA), data: { productId: produk!.id, quantity: 2 },
  });
  const cartBorong = await request.get(`${V1}/cart`, { headers: auth(buyerA) });
  const itemBorong = (await cartBorong.json()).data.items[0];
  const alamatA = await request.get(`${V1}/users/me/addresses`, { headers: auth(buyerA) });
  const borong = await request.post(`${V1}/orders/checkout`, {
    headers: auth(buyerA),
    data: {
      addressId: (await alamatA.json()).data[0].id,
      paymentMethod: 'TRANSFER_MANUAL',
      shops: [{ shopId: itemBorong.shop.id, cartItemIds: [itemBorong.id], shippingMethod: 'REGULAR' }],
    },
  });
  expect(borong.status()).toBe(201);
  const orderBorong = (await borong.json()).data.orders[0] as {
    id: string; items: { price: number }[];
  };
  expect(
    orderBorong.items[0].price,
    'beli 2 saat kuota tinggal 1 harus dibayar harga normal, bukan harga flash',
  ).toBe(produk!.price);

  const cekBorong = await request.get(`${ADMIN_FS}/${eventId}`, { headers: auth(adminToken) });
  expect(
    ((await cekBorong.json()).data.items[0] as { soldCount: number }).soldCount,
    'kuota tidak boleh tersentuh oleh permintaan yang melebihinya',
  ).toBe(0);

  await request.post(`${V1}/orders/${orderBorong.id}/cancel`, {
    headers: auth(buyerA), data: { reason: 'Uji otomatis batas kuota' },
  });

  // ── Bagian 2: dua checkout benar-benar bersamaan.
  //
  // Konteks HTTP terpisah, bukan dua `Promise.all` di konteks yang sama:
  // `APIRequestContext` memakai satu pool koneksi dan permintaannya
  // terserialisasi, sehingga versi pertama test ini "lolos" bahkan setelah
  // penjaga kuotanya sengaja dilumpuhkan — yang teruji cuma jalur sekuensial.
  const payloadA = await siapkanCheckout(buyerA);
  const payloadB = await siapkanCheckout(buyerB);

  type Pesanan = { id: string; subtotal: number; items: { price: number; quantity: number }[] };

  const ctxA = await apiRequest.newContext();
  const ctxB = await apiRequest.newContext();
  let hasil: { status: number; order: Pesanan }[];
  try {
    const respons = await Promise.all([
      ctxA.post(`${V1}/orders/checkout`, { headers: auth(buyerA), data: payloadA }),
      ctxB.post(`${V1}/orders/checkout`, { headers: auth(buyerB), data: payloadB }),
    ]);
    // Body dibaca SEBELUM konteksnya ditutup — `dispose()` ikut membuang
    // respons yang lahir darinya.
    hasil = await Promise.all(
      respons.map(async (r) => ({
        status: r.status(),
        order: ((await r.json()).data as { orders: Pesanan[] }).orders[0],
      })),
    );
  } finally {
    await ctxA.dispose();
    await ctxB.dispose();
  }

  // Keduanya HARUS berhasil. Kuota promo yang habis bukan alasan menggagalkan
  // belanja orang — yang kalah cukup membayar harga normal.
  expect(hasil[0].status, 'checkout A harus tetap berhasil').toBe(201);
  expect(hasil[1].status, 'checkout B harus tetap berhasil').toBe(201);

  const orderA = hasil[0].order;
  const orderB = hasil[1].order;

  try {
    const hargaKeduanya = [orderA.items[0].price, orderB.items[0].price];
    const dapatFlash = hargaKeduanya.filter((h) => h === hargaFlash);
    const hargaNormal = hargaKeduanya.filter((h) => h === produk!.price);

    expect(dapatFlash.length, `tepat satu yang boleh dapat harga flash, dapat: ${hargaKeduanya}`).toBe(1);
    expect(hargaNormal.length, 'yang kalah membayar harga normal, bukan gagal').toBe(1);

    // Totalnya ikut benar — bukti harga yang dipakai membangun subtotal adalah
    // harga setelah kuota diperebutkan, bukan tebakan sebelum transaksi.
    for (const o of [orderA, orderB]) {
      expect(o.subtotal).toBe(o.items.reduce((s, i) => s + i.price * i.quantity, 0));
    }

    // Kuota benar-benar tandas: satu terjual, bukan dua.
    const detail = await request.get(`${ADMIN_FS}/${eventId}`, { headers: auth(adminToken) });
    const slot = (await detail.json()).data.items[0] as { soldCount: number; quota: number };
    expect(slot.soldCount, 'kuota tidak boleh terjual melebihi batasnya').toBe(1);
    expect(slot.quota).toBe(1);
  } finally {
    // Batalkan keduanya (kuota kembali) lalu jeda event supaya event seed tetap
    // jadi yang tampil di beranda untuk test lain.
    await request.post(`${V1}/orders/${orderA.id}/cancel`, {
      headers: auth(buyerA), data: { reason: 'Uji otomatis balapan kuota' },
    });
    await request.post(`${V1}/orders/${orderB.id}/cancel`, {
      headers: auth(buyerB), data: { reason: 'Uji otomatis balapan kuota' },
    });
    await request.put(`${ADMIN_FS}/${eventId}`, {
      headers: auth(adminToken), data: { isActive: false },
    });
  }
});
