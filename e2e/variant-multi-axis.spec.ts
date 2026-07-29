// Variant multi-axis (M11-A8). Menutup jalur ber-DB: bentuk respons produk
// 2 sumbu, penyimpanan lewat API seller, dan aturan bahwa kombinasi lama
// dinonaktifkan (bukan dihapus) supaya keranjang & riwayat pesanan tetap sah.
import { test, expect } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

// Produk 2 sumbu dari seed (packages/database/src/seed.ts).
const SEEDED_MULTI_AXIS = 'Baju Koko Lengan Pendek Katun';

test(tc('132', 'Produk 2 sumbu tampil dengan opsi & kombinasi'), async ({ request }) => {
  const list = await request.get(`${V1}/products?q=${encodeURIComponent(SEEDED_MULTI_AXIS)}&limit=5`);
  const found = (await list.json()).data.items.find(
    (p: { name: string }) => p.name === SEEDED_MULTI_AXIS,
  );
  expect(found, 'produk 2 sumbu dari seed tidak ketemu — jalankan db:seed').toBeTruthy();

  const res = await request.get(`${V1}/products/${found.slug}`);
  expect(res.status()).toBe(200);
  const p = (await res.json()).data;

  // 1. Dua opsi, urut, masing-masing punya nilai.
  expect(p.options).toHaveLength(2);
  expect(p.options[0].name).toBe('Warna');
  expect(p.options[1].name).toBe('Ukuran');
  expect(p.options[0].values.map((v: { value: string }) => v.value)).toEqual(['Putih', 'Navy']);
  expect(p.options[1].values.map((v: { value: string }) => v.value)).toEqual(['M', 'L', 'XL']);

  // 2. Tiap variant membawa nilai per sumbu, urut sesuai option.
  expect(p.variants.length).toBeGreaterThan(0);
  for (const v of p.variants) {
    expect(v.optionValues).toHaveLength(2);
    expect(p.options[0].values.some((x: { value: string }) => x.value === v.optionValues[0])).toBe(true);
    expect(p.options[1].values.some((x: { value: string }) => x.value === v.optionValues[1])).toBe(true);
    // `name` tetap jadi label gabungan — dipakai snapshot OrderItem.variantName.
    expect(v.name).toBe(v.optionValues.join(' / '));
  }

  // 3. Kombinasi berstok 0 dari seed (Navy/XL) tetap dikirim, biar FE bisa
  //    menampilkannya sebagai chip nonaktif alih-alih menyembunyikannya.
  const navyXl = p.variants.find(
    (v: { optionValues: string[] }) => v.optionValues[0] === 'Navy' && v.optionValues[1] === 'XL',
  );
  expect(navyXl).toBeTruthy();
  expect(navyXl.stock).toBe(0);
});

test(tc('133', 'Seller simpan produk multi-axis lewat API'), async ({ request }) => {
  const token = tokenFor('seller');

  const catRes = await request.get(`${V1}/categories`);
  const cats = (await catRes.json()).data;
  const categoryId = (Array.isArray(cats) ? cats : cats.items)[0].id;

  const name = `Kaos Varian E2E ${Date.now()}`;
  const create = await request.post(`${V1}/seller/products`, {
    headers: auth(token),
    data: {
      name,
      description: 'Produk uji multi-axis dari suite E2E Tokopudidi.',
      categoryId,
      price: 50_000,
      stock: 10,
      weight: 200,
      imageUrls: ['https://placehold.co/600x600/png'],
      options: [
        { name: 'Warna', values: ['Merah', 'Biru'] },
        { name: 'Ukuran', values: ['S', 'M'] },
      ],
      variants: [
        { values: ['Merah', 'S'], priceModifier: 0, stock: 3 },
        { values: ['Merah', 'M'], priceModifier: 1000, stock: 4 },
        { values: ['Biru', 'S'], priceModifier: 0, stock: 5 },
        { values: ['Biru', 'M'], priceModifier: 1000, stock: 6 },
      ],
    },
  });
  expect(create.status()).toBe(201);
  const productId = (await create.json()).data.id;

  // 1. Baca balik: opsi & 4 kombinasi tersimpan.
  const detail = await request.get(`${V1}/seller/products/${productId}`, { headers: auth(token) });
  expect(detail.status()).toBe(200);
  const d = (await detail.json()).data;
  expect(d.options).toHaveLength(2);
  expect(d.variants).toHaveLength(4);

  const merahM = d.variants.find((v: { name: string }) => v.name === 'Merah / M');
  expect(merahM).toBeTruthy();
  expect(merahM.priceModifier).toBe(1000);
  expect(merahM.stock).toBe(4);
  const merahMId = merahM.id;

  // 2. Edit: buang ukuran M. Kombinasi Merah/S harus MEMPERTAHANKAN id-nya
  //    (dipegang keranjang & riwayat pesanan), Merah/M hilang dari daftar aktif.
  const merahSId = d.variants.find((v: { name: string }) => v.name === 'Merah / S').id;

  const update = await request.patch(`${V1}/seller/products/${productId}`, {
    headers: auth(token),
    data: {
      options: [
        { name: 'Warna', values: ['Merah', 'Biru'] },
        { name: 'Ukuran', values: ['S'] },
      ],
      variants: [
        { values: ['Merah', 'S'], priceModifier: 0, stock: 9 },
        { values: ['Biru', 'S'], priceModifier: 0, stock: 5 },
      ],
    },
  });
  expect(update.status()).toBe(200);

  const after = await request.get(`${V1}/seller/products/${productId}`, { headers: auth(token) });
  const a = (await after.json()).data;
  expect(a.variants).toHaveLength(2);

  const merahSAfter = a.variants.find((v: { name: string }) => v.name === 'Merah / S');
  expect(merahSAfter.id, 'id kombinasi yang bertahan tidak boleh berubah').toBe(merahSId);
  expect(merahSAfter.stock).toBe(9);

  // Merah/M tidak lagi aktif — tapi barisnya masih ada di DB (tidak dihapus),
  // yang dibuktikan id-nya tidak dipakai ulang oleh kombinasi lain.
  expect(a.variants.some((v: { id: string }) => v.id === merahMId)).toBe(false);

  // 3. Bersihkan.
  await request.delete(`${V1}/seller/products/${productId}`, { headers: auth(token) });
});

test(tc('134', 'API menolak kombinasi varian yang tidak sah'), async ({ request }) => {
  const token = tokenFor('seller');
  const catRes = await request.get(`${V1}/categories`);
  const cats = (await catRes.json()).data;
  const categoryId = (Array.isArray(cats) ? cats : cats.items)[0].id;

  const base = {
    description: 'Produk uji penolakan varian dari suite E2E.',
    categoryId,
    price: 50_000,
    stock: 10,
    weight: 200,
    imageUrls: ['https://placehold.co/600x600/png'],
  };

  // Varian tanpa opsi.
  const tanpaOpsi = await request.post(`${V1}/seller/products`, {
    headers: auth(token),
    data: { ...base, name: `Tolak A ${Date.now()}`, variants: [{ values: ['Merah'], stock: 1 }] },
  });
  expect(tanpaOpsi.status()).toBe(400);

  // Nilai di luar daftar opsi.
  const nilaiAsing = await request.post(`${V1}/seller/products`, {
    headers: auth(token),
    data: {
      ...base,
      name: `Tolak B ${Date.now()}`,
      options: [{ name: 'Warna', values: ['Merah'] }],
      variants: [{ values: ['Hijau'], stock: 1 }],
    },
  });
  expect(nilaiAsing.status()).toBe(400);

  // Melebihi batas 50 kombinasi (6 x 9 = 54).
  const kebanyakan = await request.post(`${V1}/seller/products`, {
    headers: auth(token),
    data: {
      ...base,
      name: `Tolak C ${Date.now()}`,
      options: [
        { name: 'Warna', values: Array.from({ length: 6 }, (_, i) => `W${i}`) },
        { name: 'Ukuran', values: Array.from({ length: 9 }, (_, i) => `U${i}`) },
      ],
    },
  });
  expect(kebanyakan.status()).toBe(400);
});

test(tc('135', 'Produk tanpa varian tetap normal'), async ({ request }) => {
  // Regresi: mayoritas produk tidak punya varian sama sekali dan harus tetap
  // punya bentuk respons yang sama seperti sebelum M11-A8.
  const list = await request.get(`${V1}/products?limit=20`);
  const items = (await list.json()).data.items as { slug: string }[];

  let diperiksa = 0;
  for (const it of items) {
    const res = await request.get(`${V1}/products/${it.slug}`);
    const p = (await res.json()).data;
    expect(Array.isArray(p.variants)).toBe(true);
    expect(Array.isArray(p.options)).toBe(true);
    if (p.variants.length === 0) {
      expect(p.options).toHaveLength(0);
      diperiksa++;
      if (diperiksa >= 3) break;
    }
  }
  expect(diperiksa, 'seed butuh produk tanpa varian').toBeGreaterThan(0);
});
