import { test, expect } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

test(tc('097', 'Seller membuat produk baru'), async ({ request }) => {
  const token = tokenFor('seller');

  const catRes = await request.get(`${V1}/categories`);
  const categories = (await catRes.json()).data;
  const categoryId = (Array.isArray(categories) ? categories : categories.items)[0].id;

  // Nama unik supaya slug tidak bentrok saat suite dijalankan berulang.
  const name = `Produk E2E ${Date.now()}`;

  // 1. POST /seller/products dengan data valid sesuai productCreateSchema:
  //    deskripsi >= 10 char, harga >= 100, berat >= 1 gram, minimal 1 foto.
  const create = await request.post(`${V1}/seller/products`, {
    headers: auth(token),
    data: {
      name,
      description: 'Produk uji otomatis dari suite E2E Tokopudidi.',
      categoryId,
      price: 15_000,
      stock: 10,
      weight: 500,
      imageUrls: ['https://placehold.co/600x600/png'],
    },
  });
  expect(create.status()).toBe(201);
  const created = (await create.json()).data;
  expect(created.id).toBeTruthy();
  expect(created.name).toBe(name);

  // 2. GET /seller/products -> produk baru muncul di daftar.
  const list = await request.get(`${V1}/seller/products?q=${encodeURIComponent(name)}`, {
    headers: auth(token),
  });
  expect(list.status()).toBe(200);
  const body = (await list.json()).data;
  const items = Array.isArray(body) ? body : body.items;

  expect(items.some((p: { id: string }) => p.id === created.id)).toBe(true);
});
