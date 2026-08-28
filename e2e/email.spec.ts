// Email transaksional (M14-A2).
//
// Yang diuji di sini adalah email yang BENAR-BENAR keluar dari nodemailer dan
// diterima SMTP (MailHog), bukan pemanggilan fungsi internal. Bedanya nyata:
// saat menulis suite ini satu run sempat "hijau" padahal pengirimannya sengaja
// dilumpuhkan — ternyata proses API lama masih memegang port 4000 dan probe-nya
// tidak pernah ikut dijalankan. Hijau bukan bukti sampai pernah terlihat merah
// karena sebab yang benar.
//
// Butuh MailHog (`docker compose up -d mailhog`) + API dijalankan dengan
// SMTP_HOST/SMTP_PORT menunjuk ke sana. Tanpa itu suite ini **skip dengan
// sebab yang jelas** — bukan lolos diam-diam.
import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { tc, V1, auth, tokenFor, randomPhone } from './helpers/testforge';
import { bersihkanInbox, mailhogAda, pastikanTidakAdaEmail, tungguEmail } from './helpers/mailhog';

let token: string;

test.beforeAll(() => {
  token = tokenFor('buyer');
});

test.beforeEach(async ({ request }) => {
  test.skip(
    !(await mailhogAda(request)),
    'MailHog tidak jalan — API kemungkinan dalam mode log-only. Jalankan `docker compose up -d mailhog` lalu start API dengan SMTP_HOST=localhost SMTP_PORT=1025.',
  );
  await bersihkanInbox(request);
});

// ── Helper alur pesanan ──────────────────────────────────────────────────────

async function kosongkanKeranjang(request: APIRequestContext): Promise<void> {
  const res = await request.get(`${V1}/cart`, { headers: auth(token) });
  for (const it of (await res.json()).data.items) {
    await request.delete(`${V1}/cart/items/${it.id}`, { headers: auth(token) });
  }
}

async function buatAlamat(request: APIRequestContext, label: string): Promise<string> {
  const res = await request.post(`${V1}/users/me/addresses`, {
    headers: auth(token),
    data: {
      label,
      recipientName: 'Pembeli E2E',
      recipientPhone: '081200000201',
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      district: 'Kebayoran Baru',
      subdistrict: 'Gandaria Utara',
      postalCode: '12140',
      fullAddress: `Jl. ${label} No. 1`,
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data.id;
}

/**
 * Checkout satu produk milik toko `tokoDari` (kalau diisi) dengan metode bayar
 * tertentu, lalu kembalikan order-nya.
 *
 * Bentuk respons checkout **berbeda per metode**: QRIS membalas
 * `{ orders: [...], qris: {...} }`, TRANSFER_MANUAL membalas array telanjang.
 * Salah membacanya membuat `order.id` undefined dan kegagalan muncul jauh
 * kemudian sebagai 404 di endpoint pembayaran — menuduh tempat yang salah.
 */
async function checkoutSatuProduk(
  request: APIRequestContext,
  opts: { metode: 'QRIS_MOCK' | 'TRANSFER_MANUAL'; tokenSeller?: string; label: string },
) {
  await kosongkanKeranjang(request);

  let url = `${V1}/products?limit=1`;
  if (opts.tokenSeller) {
    const shopRes = await request.get(`${V1}/users/me/shop`, { headers: auth(opts.tokenSeller) });
    const shopId = (await shopRes.json()).data.id;
    url = `${V1}/products?shopId=${shopId}&limit=1`;
  }
  const produk = (await (await request.get(url)).json()).data.items[0];
  expect(produk, 'tidak ada produk yang bisa dibeli di DB ini').toBeTruthy();

  await request.post(`${V1}/cart/items`, {
    headers: auth(token),
    data: { productId: produk.id, quantity: 1 },
  });

  const addressId = await buatAlamat(request, opts.label);
  const grouped = (await (await request.get(`${V1}/cart`, { headers: auth(token) })).json()).data.grouped;

  const res = await request.post(`${V1}/orders/checkout`, {
    headers: auth(token),
    data: {
      addressId,
      paymentMethod: opts.metode,
      shops: grouped.map((g: { shop: { id: string }; items: { id: string }[] }) => ({
        shopId: g.shop.id,
        cartItemIds: g.items.map((i) => i.id),
        shippingMethod: 'REGULAR',
      })),
    },
  });
  expect(res.status()).toBe(201);
  const data = (await res.json()).data;
  const order = (Array.isArray(data) ? data : (data.orders ?? [data]))[0];
  expect(order?.id, 'bentuk respons checkout tidak dikenali').toBeTruthy();
  return order as { id: string; orderNumber: string };
}

/** Bawa satu pesanan sampai status DELIVERED — prasyarat pengajuan refund. */
async function pesananSampaiDiterima(request: APIRequestContext, tokenSeller: string) {
  const order = await checkoutSatuProduk(request, {
    metode: 'QRIS_MOCK',
    tokenSeller,
    label: 'E2E Refund',
  });
  const bayar = await request.post(`${V1}/orders/${order.id}/qris/simulate-paid`, { headers: auth(token) });
  expect(bayar.ok()).toBe(true);

  const s = { headers: auth(tokenSeller) };
  expect((await request.post(`${V1}/seller/orders/${order.id}/process`, s)).ok()).toBe(true);
  expect(
    (
      await request.post(`${V1}/seller/orders/${order.id}/ship`, {
        ...s,
        data: { trackingNumber: `JP${Date.now()}`, courierName: 'JNE' },
      })
    ).ok(),
  ).toBe(true);
  expect((await request.post(`${V1}/seller/orders/${order.id}/mark-delivered`, s)).ok()).toBe(true);
  return order;
}

/** Pasang email ke akun, tunggu welcome-nya lewat, lalu kosongkan inbox. */
async function pasangEmail(request: APIRequestContext, tokenAkun: string, email: string) {
  const res = await request.patch(`${V1}/auth/me`, { headers: auth(tokenAkun), data: { email } });
  expect(res.status()).toBe(200);
  await tungguEmail(request, (m) => m.to.includes(email) && m.subject.includes('Selamat datang'));
  await bersihkanInbox(request);
}

// ── Test ─────────────────────────────────────────────────────────────────────

test(tc('189', 'Register dengan email menerima welcome email'), async ({ request }) => {
  const phone = randomPhone();
  const email = `e2e-welcome-${Date.now()}@contoh.test`;

  const res = await request.post(`${V1}/auth/register`, {
    data: { phone, password: 'rahasia123', fullName: 'Pembeli Email E2E', email },
  });
  expect(res.status()).toBe(201);

  const mail = await tungguEmail(request, (m) => m.to.includes(email));
  expect(mail.subject).toContain('Selamat datang');
  expect(mail.body).toContain('Pembeli Email E2E');
});

test(tc('190', 'Register tanpa email tidak mengirim apa pun'), async ({ request }) => {
  const res = await request.post(`${V1}/auth/register`, {
    data: { phone: randomPhone(), password: 'rahasia123', fullName: 'Tanpa Email E2E' },
  });
  expect(res.status()).toBe(201);

  // Acceptance "user tanpa email → tidak ada error, tidak ada kiriman".
  // Inbox baru saja dikosongkan di beforeEach, jadi email apa pun yang muncul
  // di sini pasti berasal dari pendaftaran barusan.
  await pastikanTidakAdaEmail(request, () => true);
});

test(tc('191', 'Checkout mengirim email rincian pesanan ke pembeli'), async ({ request }) => {
  const email = `e2e-order-${Date.now()}@contoh.test`;
  // Buyer seed tidak punya email; dipasang lewat endpoint yang sama dengan yang
  // dipakai halaman /akun — sekaligus membuktikan jalur pengisiannya ada.
  await pasangEmail(request, token, email);

  const order = await checkoutSatuProduk(request, { metode: 'TRANSFER_MANUAL', label: 'E2E Email' });

  const mail = await tungguEmail(request, (m) => m.to.includes(email) && m.subject.includes(order.orderNumber));
  // Nomor pesanan di subject saja tidak cukup: yang membuat email ini berguna
  // adalah rincian di badannya.
  expect(mail.body).toContain(order.orderNumber);
  expect(mail.body).toContain('Total');
  // Instruksi bayar harus sesuai metode yang dipakai, bukan kalimat umum.
  expect(mail.body).toContain('bukti bayar');
});

test(tc('193', 'Pesanan dibayar & dikirim mengirim email ke toko lalu ke pembeli'), async ({ request }) => {
  const emailBuyer = `e2e-kirim-buyer-${Date.now()}@contoh.test`;
  const emailSeller = `e2e-kirim-seller-${Date.now()}@contoh.test`;
  const tokenSeller = tokenFor('seller');

  await pasangEmail(request, token, emailBuyer);
  await pasangEmail(request, tokenSeller, emailSeller);

  const order = await checkoutSatuProduk(request, {
    metode: 'QRIS_MOCK',
    tokenSeller,
    label: 'E2E Kirim',
  });

  // 1. Dibayar → email ke PEMILIK TOKO (bukan ke pembeli).
  expect((await request.post(`${V1}/orders/${order.id}/qris/simulate-paid`, { headers: auth(token) })).ok()).toBe(true);

  const mailToko = await tungguEmail(
    request,
    (m) => m.to.includes(emailSeller) && m.subject.includes(order.orderNumber),
  );
  expect(mailToko.subject).toContain('sudah dibayar');

  // 2. Dikirim + resi → email ke PEMBELI, memuat kurir & nomor resi.
  await request.post(`${V1}/seller/orders/${order.id}/process`, { headers: auth(tokenSeller) });
  const resi = `JP${Date.now()}`;
  const kirim = await request.post(`${V1}/seller/orders/${order.id}/ship`, {
    headers: auth(tokenSeller),
    data: { trackingNumber: resi, courierName: 'JNE' },
  });
  expect(kirim.ok()).toBe(true);

  const mailKirim = await tungguEmail(
    request,
    (m) => m.to.includes(emailBuyer) && m.subject.includes('dikirim'),
  );
  expect(mailKirim.body).toContain(resi);
  expect(mailKirim.body).toContain('JNE');
});

test(tc('194', 'Keputusan refund admin dikabari lewat email ke pengaju'), async ({ request }) => {
  const emailBuyer = `e2e-refund-${Date.now()}@contoh.test`;
  const tokenAdmin = tokenFor('admin');
  const tokenSeller = tokenFor('seller');

  await pasangEmail(request, token, emailBuyer);

  // Refund-nya dibuat sendiri, bukan mengandalkan satu baris PENDING dari seed.
  // Versi pertama memang membaca seed — dan begitu run pertama memakainya, run
  // berikutnya "lolos" sebagai skip tanpa menguji apa pun. Test yang bisa hijau
  // tanpa pernah menjalankan jalurnya lebih buruk daripada tidak ada.
  const order = await pesananSampaiDiterima(request, tokenSeller);

  const ajukan = await request.post(`${V1}/orders/${order.id}/refund`, {
    headers: auth(token),
    data: { reason: 'Barang tidak sesuai deskripsi sama sekali, warnanya beda.' },
  });
  expect(ajukan.status()).toBe(201);
  const refund = (await ajukan.json()).data;
  expect(refund?.id, 'pengajuan refund tidak mengembalikan id').toBeTruthy();

  await bersihkanInbox(request);
  const putus = await request.post(`${V1}/admin/refunds/${refund.id}/resolve`, {
    headers: auth(tokenAdmin),
    data: { approved: false, adminNote: 'Bukti tidak mencukupi' },
  });
  expect(putus.ok()).toBe(true);

  // Pencocokan menyertakan subject, bukan alamat saja: email lain untuk akun
  // yang sama bisa mendarat berdekatan dan tertangkap sebagai "email refund".
  const mail = await tungguEmail(request, (m) => m.to.includes(emailBuyer) && /refund/i.test(m.subject));
  expect(mail.subject).toMatch(/ditolak/i);
  expect(mail.body).toContain('Bukti tidak mencukupi');
});

test(tc('192', 'Email akun bisa diisi & ditolak kalau sudah dipakai akun lain'), async ({ request }) => {
  const email = `e2e-dupe-${Date.now()}@contoh.test`;

  // Akun lain mengklaim email ini lebih dulu.
  const lain = await request.post(`${V1}/auth/register`, {
    data: { phone: randomPhone(), password: 'rahasia123', fullName: 'Pemilik Email', email },
  });
  expect(lain.status()).toBe(201);

  // Buyer seed mencoba memakai email yang sama → 409, bukan 500 dari constraint
  // unique yang bocor sebagai error database.
  const bentrok = await request.patch(`${V1}/auth/me`, { headers: auth(token), data: { email } });
  expect(bentrok.status()).toBe(409);
  expect((await bentrok.json()).message).toMatch(/sudah dipakai/i);

  // String kosong = berhenti berlangganan, dan itu bukan error.
  const hapus = await request.patch(`${V1}/auth/me`, { headers: auth(token), data: { email: '' } });
  expect(hapus.status()).toBe(200);
  expect((await hapus.json()).data.email).toBeNull();
});
