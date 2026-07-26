import { test, expect } from '@playwright/test';
import { tc, V1, SEED, auth, tokenFor, randomPhone } from './helpers/testforge';

// Dua case ini berbasis UI karena case manualnya memang menyebut halaman
// /masuk dan /daftar beserta field-nya.

test(tc('019', 'Login berhasil dengan nomor HP & password valid'), async ({ page }) => {
  // 1. Buka /masuk -> form tampil dengan field Nomor HP, Password, tombol Masuk.
  await page.goto('/masuk');
  await expect(page.getByLabel('Nomor HP')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  const submit = page.getByRole('button', { name: 'Masuk' });
  await expect(submit).toBeVisible();

  // 2. Isi kredensial buyer seed, klik Masuk -> POST /auth/login sukses.
  const loginCall = page.waitForResponse(
    (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
  );
  await page.getByLabel('Nomor HP').fill(SEED.buyer.phone);
  await page.getByLabel('Password').fill(SEED.buyer.password);
  await submit.click();

  const res = await loginCall;
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.data.tokens.accessToken).toBeTruthy();
  expect(body.data.tokens.refreshToken).toBeTruthy();

  // 3. Redirect ke beranda dalam keadaan terautentikasi.
  await page.waitForURL('**/');
  expect(new URL(page.url()).pathname).toBe('/');
});

test(tc('026', 'Registrasi akun baru berhasil'), async ({ page }) => {
  // Nomor acak tiap run — precondition case: nomor HP belum terdaftar.
  const phone = randomPhone();

  // 1. Buka /daftar, isi nama, nomor HP, password valid.
  await page.goto('/daftar');
  await page.getByLabel('Nama Lengkap').fill('Pembeli E2E');
  await page.getByLabel('Nomor HP').fill(phone);
  await page.getByLabel('Password').fill('rahasia123');

  // 2. Klik Daftar -> POST /auth/register sukses, akun BUYER dibuat.
  const registerCall = page.waitForResponse(
    (r) => r.url().includes('/api/v1/auth/register') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Daftar Sekarang' }).click();

  const res = await registerCall;
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.data.user.role).toBe('BUYER');
  // Nomor dinormalisasi ke +62 oleh phoneSchema.
  expect(body.data.user.phone).toBe(`+62${phone.slice(1)}`);
  // referralCode unik dibuat untuk tiap akun baru.
  expect(body.data.user.referralCode).toMatch(/^[A-Z0-9]{8}$/);

  // 3. User diarahkan ke beranda dalam keadaan masuk.
  await page.waitForURL('**/');
  expect(new URL(page.url()).pathname).toBe('/');
});

test(tc('114', 'Endpoint admin menolak non-admin'), async ({ request }) => {
  // 1. Akses /admin/* sebagai non-admin (buyer) -> 403.
  const asBuyer = await request.get(`${V1}/admin/dashboard`, {
    headers: auth(tokenFor('buyer')),
  });
  expect(asBuyer.status()).toBe(403);

  // 2. Akses tanpa token -> 401.
  const anon = await request.get(`${V1}/admin/dashboard`);
  expect(anon.status()).toBe(401);
});
