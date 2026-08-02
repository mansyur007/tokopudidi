// Bulk edit stok & harga (M14-B2).
//
// Yang tidak bisa diuji unit test: routing `/bulk` benar-benar tidak tertelan
// `PATCH /:id`, kepemilikan ditolak TANPA menulis sebagian, dan tabrakan harga
// baru dengan diskon / harga grosir existing benar-benar dijaga di jalur ini —
// bukan cuma di form satuan.
import { test, expect, type APIRequestContext } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

const BULK = `${V1}/seller/products/bulk`;

interface SellerProduct {
  id: string; name: string; price: number; stock: number; isActive: boolean;
}

async function sellerProducts(request: APIRequestContext, token: string): Promise<SellerProduct[]> {
  const res = await request.get(`${V1}/seller/products?limit=50`, { headers: auth(token) });
  expect(res.status()).toBe(200);
  return (await res.json()).data.items;
}

async function productById(request: APIRequestContext, token: string, id: string) {
  const res = await request.get(`${V1}/seller/products/${id}`, { headers: auth(token) });
  expect(res.status()).toBe(200);
  return (await res.json()).data;
}

test(tc('170', 'Bulk edit: banyak produk dalam satu request, hanya kolom yang dikirim yang berubah'), async ({ request }) => {
  const token = tokenFor('seller');
  const semua = await sellerProducts(request, token);
  expect(semua.length, 'seed butuh minimal 2 produk milik seller').toBeGreaterThanOrEqual(2);

  // Produk tanpa diskon & tanpa tier — supaya test ini menguji jalur biasa,
  // bukan tabrakan harga yang sudah punya test sendiri di TC-172.
  const kandidat: SellerProduct[] = [];
  for (const p of semua) {
    const detail = await productById(request, token, p.id);
    if (detail.salePrice == null && (detail.wholesaleTiers ?? []).length === 0) kandidat.push(p);
    if (kandidat.length === 2) break;
  }
  expect(kandidat.length, 'butuh 2 produk tanpa diskon & tanpa harga grosir').toBe(2);

  const [a, b] = kandidat;
  const stokBaruA = a.stock + 7;
  const hargaBaruB = b.price + 5_000;

  const res = await request.patch(BULK, {
    headers: auth(token),
    data: {
      items: [
        { id: a.id, stock: stokBaruA },   // stok saja
        { id: b.id, price: hargaBaruB },  // harga saja
      ],
    },
  });
  expect(res.status()).toBe(200);
  expect((await res.json()).data.updated).toBe(2);

  // Kolom yang TIDAK dikirim tidak boleh ikut berubah — ini yang membedakan
  // "update parsial" dari "timpa seluruh baris".
  const sesudahA = await productById(request, token, a.id);
  expect(sesudahA.stock).toBe(stokBaruA);
  expect(sesudahA.price, 'harga A tidak dikirim, jadi tidak boleh berubah').toBe(a.price);

  const sesudahB = await productById(request, token, b.id);
  expect(sesudahB.price).toBe(hargaBaruB);
  expect(sesudahB.stock, 'stok B tidak dikirim, jadi tidak boleh berubah').toBe(b.stock);

  // Kembalikan ke keadaan semula supaya run berikutnya berangkat dari titik sama.
  const pulih = await request.patch(BULK, {
    headers: auth(token),
    data: { items: [{ id: a.id, stock: a.stock }, { id: b.id, price: b.price }] },
  });
  expect(pulih.status()).toBe(200);
});

test(tc('171', 'Bulk edit: produk toko lain ditolak 403 dan tidak ada satu pun yang tersimpan'), async ({ request }) => {
  const token = tokenFor('seller');
  const milikku = (await sellerProducts(request, token))[0];

  // Produk milik toko lain, diambil dari katalog publik.
  const katalog = await request.get(`${V1}/products?limit=50`);
  const cards = (await katalog.json()).data.items as { id: string; shop: { id: string } }[];
  const shopRes = await request.get(`${V1}/seller/shop`, { headers: auth(token) });
  const shopId = (await shopRes.json()).data.id as string;
  const asing = cards.find((c) => c.shop.id !== shopId);
  expect(asing, 'seed butuh produk dari toko lain').toBeTruthy();

  const stokSebelum = milikku.stock;

  const res = await request.patch(BULK, {
    headers: auth(token),
    data: {
      items: [
        { id: milikku.id, stock: stokSebelum + 99 }, // sah
        { id: asing!.id, stock: 0 },                 // bukan milik toko ini
      ],
    },
  });
  expect(res.status()).toBe(403);

  // Yang sah pun tidak boleh tersimpan: penolakan terjadi sebelum apa pun
  // ditulis, jadi seller tidak meninggalkan perubahan yang tak pernah ia
  // konfirmasi.
  const sesudah = await productById(request, token, milikku.id);
  expect(sesudah.stock, 'tidak boleh ada penulisan sebagian').toBe(stokSebelum);
});

test(tc('172', 'Bulk edit tidak bisa dipakai menembus aturan harga diskon & harga grosir'), async ({ request }) => {
  const token = tokenFor('seller');
  const semua = await sellerProducts(request, token);

  // Cari produk yang punya harga grosir (seed memberi tier pada salah satu).
  let bertier: { id: string; price: number; tierTertinggi: number } | null = null;
  for (const p of semua) {
    const d = await productById(request, token, p.id);
    const tiers = (d.wholesaleTiers ?? []) as { price: number }[];
    if (tiers.length > 0) {
      bertier = { id: p.id, price: d.price, tierTertinggi: Math.max(...tiers.map((t) => t.price)) };
      break;
    }
  }
  expect(bertier, 'seed butuh produk berharga grosir — jalankan `npm run db:seed` terbaru').toBeTruthy();

  const stokSebelum = (await productById(request, token, bertier!.id)).stock;

  // Harga baru di bawah tier tertinggi: kalau lolos, harga "grosir" jadi lebih
  // MAHAL daripada harga biasa. Jalur satuan sudah menolaknya sejak M13-B1,
  // jadi jalur massal juga harus.
  const res = await request.patch(BULK, {
    headers: auth(token),
    data: { items: [{ id: bertier!.id, price: Math.max(100, bertier!.tierTertinggi - 1) }] },
  });
  expect(res.status()).toBe(422);

  const body = await res.json();
  // Alasannya dikirim per id produk supaya FE bisa menandai barisnya.
  expect(body.errors, '422 harus menyebut baris mana yang bermasalah').toHaveProperty(bertier!.id);

  const sesudah = await productById(request, token, bertier!.id);
  expect(sesudah.price, 'harga tidak boleh berubah saat ditolak').toBe(bertier!.price);
  expect(sesudah.stock).toBe(stokSebelum);
});

test(tc('173', 'Bulk edit: /bulk tidak tertelan route :id, dan payload tak masuk akal ditolak'), async ({ request }) => {
  const token = tokenFor('seller');
  const p = (await sellerProducts(request, token))[0];

  // Tanpa token -> 401. Endpoint ini menulis banyak baris sekaligus.
  expect((await request.patch(BULK, { data: { items: [{ id: p.id, stock: 1 }] } })).status()).toBe(401);

  // Buyer biasa -> 403.
  const asBuyer = await request.patch(BULK, {
    headers: auth(tokenFor('buyer')), data: { items: [{ id: p.id, stock: 1 }] },
  });
  expect(asBuyer.status()).toBe(403);

  const stokSebelum = p.stock;

  for (const [nama, bad] of [
    ['tanpa item', { items: [] }],
    ['baris tanpa perubahan', { items: [{ id: p.id }] }],
    ['id kembar', { items: [{ id: p.id, stock: 1 }, { id: p.id, stock: 2 }] }],
    ['harga di bawah minimum', { items: [{ id: p.id, price: 99 }] }],
    ['stok negatif', { items: [{ id: p.id, stock: -1 }] }],
    ['id bukan uuid', { items: [{ id: 'produk-1', stock: 1 }] }],
  ] as const) {
    const res = await request.patch(BULK, { headers: auth(token), data: bad });
    // 400 dari zod — kalau `/bulk` tertelan `PATCH /:id`, yang muncul justru
    // 404 "Produk tidak ditemukan" (id = "bulk"), jadi kode inilah buktinya
    // route yang benar yang menangani.
    expect(res.status(), `payload "${nama}" harus ditolak 400`).toBe(400);
  }

  const sesudah = await productById(request, token, p.id);
  expect(sesudah.stock, 'payload yang ditolak tidak boleh menulis apa pun').toBe(stokSebelum);
});
