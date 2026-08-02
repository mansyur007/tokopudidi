// Badge reputasi toko (M14-B1). Yang diuji di sini adalah hal yang tidak bisa
// dijamin unit test helper: bahwa badge itu benar-benar **diturunkan saat
// dibaca** dari baris Shop (bukan kolom tersimpan yang bisa basi), bahwa
// OFFICIAL menang di jalur nyata, dan bahwa bahan mentahnya sudah tidak lagi
// bocor ke pembeli — utang M10-A10 yang dibayar item ini.
//
// Nilai `ratingAvg`/`totalSold` di seed sengaja acak, jadi test ini tidak
// pernah menuntut badge tertentu dari data seed. Yang diperiksa adalah
// *perubahannya* saat flag official di-toggle admin, yang deterministik.
import { test, expect } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

type Req = import('@playwright/test').APIRequestContext;

const BADGES = ['OFFICIAL', 'STAR_PLUS', 'STAR'];

async function pickShop(request: Req) {
  const res = await request.get(`${V1}/shops/featured`);
  const shops = (await res.json()).data as { id: string; slug: string; badge: string | null }[];
  expect(shops.length, 'seed butuh minimal 1 toko featured').toBeGreaterThan(0);
  return shops[0];
}

async function shopDetail(request: Req, slug: string) {
  const res = await request.get(`${V1}/shops/${slug}`);
  expect(res.status()).toBe(200);
  return (await res.json()).data;
}

test(tc('167', 'Badge toko dikirim di kartu, detail toko & detail produk — bahan mentahnya tidak ikut bocor'), async ({ request }) => {
  // 1. Kartu produk: `badge` wajib ADA sebagai field (boleh null), karena FE
  //    tidak lagi punya bahan untuk menghitungnya sendiri.
  const list = await request.get(`${V1}/products?limit=10`);
  expect(list.status()).toBe(200);
  const cards = (await list.json()).data.items as {
    slug: string;
    shop: Record<string, unknown>;
  }[];
  expect(cards.length).toBeGreaterThan(0);

  for (const card of cards) {
    expect(card.shop, 'kartu produk harus punya field shop.badge').toHaveProperty('badge');
    if (card.shop.badge !== null) expect(BADGES).toContain(card.shop.badge);
    // Bahan mentah badge tidak boleh ikut — kalau bocor, FE tergoda menghitung
    // ulang aturannya dan kita kembali punya dua sumber kebenaran.
    expect(card.shop.ktpVerified, 'ktpVerified tidak boleh dikirim ke pembeli').toBeUndefined();
    expect(card.shop.isOfficialStore, 'isOfficialStore tidak boleh dikirim ke pembeli').toBeUndefined();
  }

  // 2. Detail produk: badge ada, bahan mentah tidak.
  const detail = await request.get(`${V1}/products/${cards[0].slug}`);
  expect(detail.status()).toBe(200);
  const p = (await detail.json()).data;
  expect(p.shop).toHaveProperty('badge');
  expect(p.shop.ktpVerified).toBeUndefined();
  expect(p.shop.isOfficialStore).toBeUndefined();

  // 3. Detail toko: sama.
  const shop = await pickShop(request);
  const d = await shopDetail(request, shop.slug);
  expect(d).toHaveProperty('badge');
  expect(d.ktpVerified, 'detail toko tidak boleh lagi mengirim ktpVerified').toBeUndefined();
  expect(d.isOfficialStore).toBeUndefined();
});

test(tc('168', 'Badge OFFICIAL menang atas badge performa dan diturunkan saat dibaca, tanpa cron'), async ({ request }) => {
  const adminToken = tokenFor('admin');
  const shop = await pickShop(request);
  const sebelum = (await shopDetail(request, shop.slug)).badge as string | null;

  // Toko seed tidak pernah official, jadi badge awalnya pasti bukan OFFICIAL.
  expect(sebelum).not.toBe('OFFICIAL');

  const nyalakan = await request.post(`${V1}/admin/shops/${shop.id}/official-store`, {
    headers: auth(adminToken),
  });
  expect(nyalakan.status()).toBe(200);

  try {
    // Tanpa cron, tanpa reindex: pembacaan berikutnya langsung berubah.
    const saatOfficial = await shopDetail(request, shop.slug);
    expect(saatOfficial.badge, 'OFFICIAL harus menang atas badge performa').toBe('OFFICIAL');

    // Dan perubahannya ikut terlihat di kartu produk toko itu, bukan cuma di
    // halaman tokonya — keduanya memakai helper yang sama.
    const produkToko = await request.get(`${V1}/products?shopId=${shop.id}&limit=5`);
    expect(produkToko.status()).toBe(200);
    const items = (await produkToko.json()).data.items as { shop: { badge: string | null } }[];
    expect(items.length, 'toko featured seharusnya punya produk aktif').toBeGreaterThan(0);
    for (const it of items) expect(it.shop.badge).toBe('OFFICIAL');
  } finally {
    // Kembalikan keadaan semula — endpoint-nya toggle, jadi test ini tidak
    // boleh meninggalkan toko seed dalam status official untuk run berikutnya.
    const matikan = await request.post(`${V1}/admin/shops/${shop.id}/official-store`, {
      headers: auth(adminToken),
    });
    expect(matikan.status()).toBe(200);
  }

  // Badge kembali ke nilai semula: buktinya memang diturunkan dari kolom yang
  // ada, bukan disimpan sendiri lalu ketinggalan zaman.
  const sesudah = (await shopDetail(request, shop.slug)).badge as string | null;
  expect(sesudah).toBe(sebelum);
});

test(tc('169', 'Halaman toko & produk menampilkan badge, bukan lagi tanda centang dari ktpVerified'), async ({ page, request }) => {
  const shop = await pickShop(request);
  const detail = await shopDetail(request, shop.slug);

  await page.goto(`/toko/${shop.slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const badge = page.getByTestId('shop-badge').first();
  if (detail.badge) {
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-badge', detail.badge);
    // Tooltip wajib menjelaskan artinya — badge tanpa keterangan cuma bikin
    // pembeli menebak.
    const title = await badge.getAttribute('title');
    expect(title && title.length).toBeGreaterThan(10);
  } else {
    // Toko tanpa badge tidak boleh menampilkan penanda apa pun (dulu ✅ selalu
    // muncul untuk setiap toko ber-KTP terverifikasi).
    await expect(badge).toHaveCount(0);
  }
});
