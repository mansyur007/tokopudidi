import { test, expect } from '@playwright/test';
import { tc, V1, SEED, login, auth } from './helpers/testforge';

test(tc('124', 'RBAC lintas peran ditegakkan'), async ({ request }) => {
  const buyer = await login(request, SEED.buyer);
  const seller = await login(request, SEED.seller);

  // 1. Endpoint /seller/* sebagai BUYER -> 403 (requireShopOwner menolak
  //    role selain SELLER/ADMIN sebelum menyentuh data toko).
  const sellerAsBuyer = await request.get(`${V1}/seller/products`, { headers: auth(buyer) });
  expect(sellerAsBuyer.status()).toBe(403);

  // 2. Endpoint /admin/* sebagai SELLER -> 403.
  const adminAsSeller = await request.get(`${V1}/admin/dashboard`, { headers: auth(seller) });
  expect(adminAsSeller.status()).toBe(403);

  // 3. Resource milik user lain -> 403/404 (IDOR). Pesanan milik buyer
  //    tidak boleh terbaca oleh akun seller.
  const ordersRes = await request.get(`${V1}/orders`, { headers: auth(buyer) });
  const body = (await ordersRes.json()).data;
  const orders = Array.isArray(body) ? body : body.items;

  test.skip(!orders?.length, 'Buyer belum punya pesanan untuk diuji IDOR-nya.');

  const foreign = await request.get(`${V1}/orders/${orders[0].id}`, { headers: auth(seller) });
  expect([403, 404]).toContain(foreign.status());
});
