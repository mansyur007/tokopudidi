import { request } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { SEED, TOKEN_CACHE, login, type Role } from './helpers/testforge';

// API membatasi login lewat `loginLimiter`: 5 percobaan / 60 detik / IP.
// Kalau tiap test login sendiri, suite ini menembus batas itu dan test terakhir
// gagal HTTP 429 (persis yang terjadi di run pertama PR #29). Karena itu login
// dilakukan SEKALI di sini, tokennya di-cache, lalu dipakai ulang semua spec.
//
// Hanya peran yang benar-benar dipakai yang di-login, supaya tetap ada jarak ke
// batas 5/menit untuk login UI di TC-019 beserta retry-nya.
//
// Anggaran login per menit setelah `admin` masuk (M12-C3 butuh token admin):
//   3 di sini + 1 login UI TC-019 = 4, dan 5 kalau TC-019 di-retry di CI.
// Batasnya 5, jadi masih lewat — tapi sisanya cuma satu. Kalau nanti ada peran
// atau login UI baru, `loginLimiter` bakal kena dan test terakhir gagal 429;
// saat itu jangan sekadar menaikkan batas produksinya, ubah limiter-nya jadi
// `skipSuccessfulRequests` (limiter brute-force memang mestinya menghitung
// percobaan yang GAGAL, bukan login yang sukses).
const ROLES: Role[] = ['buyer', 'seller', 'admin'];

export default async function globalSetup(): Promise<void> {
  const ctx = await request.newContext();
  const tokens: Partial<Record<Role, string>> = {};

  try {
    for (const role of ROLES) {
      try {
        tokens[role] = await login(ctx, SEED[role]);
      } catch (err) {
        throw new Error(
          `${(err as Error).message}\n` +
            'Pastikan API hidup dan `npm run db:seed` sudah dijalankan.',
        );
      }
    }
  } finally {
    await ctx.dispose();
  }

  await mkdir(dirname(TOKEN_CACHE), { recursive: true });
  await writeFile(TOKEN_CACHE, JSON.stringify(tokens), 'utf8');
}
