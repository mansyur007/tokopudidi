import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

test(tc('124', 'RBAC lintas peran ditegakkan'), async ({ request }) => {
  const buyer = tokenFor('buyer');
  const seller = tokenFor('seller');

  // 1. Endpoint /seller/* sebagai BUYER -> 403 (requireShopOwner menolak
  //    role selain SELLER/ADMIN sebelum menyentuh data toko).
  const sellerAsBuyer = await request.get(`${V1}/seller/products`, { headers: auth(buyer) });
  expect(sellerAsBuyer.status()).toBe(403);

  // 2. Endpoint /admin/* sebagai SELLER -> 403.
  const adminAsSeller = await request.get(`${V1}/admin/dashboard`, { headers: auth(seller) });
  expect(adminAsSeller.status()).toBe(403);

  // 3. Resource milik user lain -> 403/404 (IDOR). Pesanan milik buyer
  //    tidak boleh terbaca oleh akun seller.
  //
  // Pesanannya dibuat sendiri kalau belum ada, bukan di-`test.skip`.
  // Versi lama melewati bagian ini begitu buyer kebetulan tidak punya pesanan —
  // dan test IDOR yang "lolos" tanpa pernah memanggil endpointnya justru
  // memberi rasa aman yang paling mahal: hijau, tapi tidak menguji apa pun.
  const orderId = await pastikanAdaPesanan(request, buyer);

  const foreign = await request.get(`${V1}/orders/${orderId}`, { headers: auth(seller) });
  expect([403, 404]).toContain(foreign.status());
});

/** Id satu pesanan milik buyer — dibuatkan lewat checkout kalau belum ada. */
async function pastikanAdaPesanan(request: APIRequestContext, buyer: string): Promise<string> {
  const ordersRes = await request.get(`${V1}/orders`, { headers: auth(buyer) });
  const body = (await ordersRes.json()).data;
  const orders = Array.isArray(body) ? body : body.items;
  if (orders?.length) return orders[0].id;

  const produk = (await (await request.get(`${V1}/products?limit=1`)).json()).data.items[0];
  expect(produk, 'tidak ada produk untuk membuat pesanan uji').toBeTruthy();
  await request.post(`${V1}/cart/items`, {
    headers: auth(buyer),
    data: { productId: produk.id, quantity: 1 },
  });

  const addr = await request.post(`${V1}/users/me/addresses`, {
    headers: auth(buyer),
    data: {
      label: 'E2E RBAC',
      recipientName: 'Pembeli E2E',
      recipientPhone: '081200000201',
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      district: 'Kebayoran Baru',
      subdistrict: 'Gandaria Utara',
      postalCode: '12140',
      fullAddress: 'Jl. Uji RBAC No. 1',
    },
  });
  const addressId = (await addr.json()).data.id;
  const grouped = (await (await request.get(`${V1}/cart`, { headers: auth(buyer) })).json()).data.grouped;

  const checkout = await request.post(`${V1}/orders/checkout`, {
    headers: auth(buyer),
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
  expect(checkout.status(), 'gagal menyiapkan pesanan untuk uji IDOR').toBe(201);
  const data = (await checkout.json()).data;
  return (Array.isArray(data) ? data : (data.orders ?? [data]))[0].id;
}
