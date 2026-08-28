import { readFileSync } from 'node:fs';
import type { APIRequestContext } from '@playwright/test';

// ── Penamaan test → test case TestForge ──────────────────────────────────────
// TestForge mencocokkan hasil per test dengan urutan: (1) id `TC-<SLUG>-<n>` di
// mana pun dalam nama test, (2) judul persis sama. Kita selalu pakai bentuk id
// karena judul gampang bergeser. Slug diambil dari env supaya spec yang sama
// bisa dipakai project lain.
const SLUG = (process.env.TF_PROJECT ?? 'tkpdd').toUpperCase();

/** Rakit nama test ber-id, mis. tc('019', 'Login berhasil') → "TC-TKPDD-019 Login berhasil". */
export function tc(num: string, title: string): string {
  return `TC-${SLUG}-${num} ${title}`;
}

// ── Target ───────────────────────────────────────────────────────────────────
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';
export const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:3000';

/** Prefix API v1 — dipakai semua test level-API. */
export const V1 = `${API_URL}/api/v1`;

// ── Akun seed (packages/database/src/seed.ts) ────────────────────────────────
// Nomor ditulis format 08xx; phoneSchema menormalkannya ke +62 saat login.
export const SEED = {
  admin: { phone: '081200000001', password: 'admin123' },
  seller: { phone: '081200000101', password: 'seller123' },
  buyer: { phone: '081200000201', password: 'buyer123' },
} as const;

export type Creds = { phone: string; password: string };
export type Role = keyof typeof SEED;

/**
 * Token hasil login di global-setup. Ditulis ke folder hasil (gitignored)
 * karena isinya JWT sungguhan.
 */
export const TOKEN_CACHE = 'e2e-results/tokens.json';

/**
 * Ambil access token yang sudah di-login sekali di global-setup.
 * JANGAN login ulang per test — `loginLimiter` di API hanya mengizinkan
 * 5 percobaan per menit per IP dan suite ini akan menembusnya.
 */
export function tokenFor(role: Role): string {
  let cache: Partial<Record<Role, string>>;
  try {
    cache = JSON.parse(readFileSync(TOKEN_CACHE, 'utf8'));
  } catch {
    throw new Error(`Cache token tidak terbaca (${TOKEN_CACHE}) — global-setup gagal jalan?`);
  }
  const token = cache[role];
  if (!token) throw new Error(`Token untuk peran "${role}" tidak ada di cache.`);
  return token;
}

/** Login lewat API, kembalikan access token. Melempar kalau gagal. */
export async function login(request: APIRequestContext, creds: Creds): Promise<string> {
  const res = await request.post(`${V1}/auth/login`, { data: creds });
  if (!res.ok()) {
    throw new Error(`Login ${creds.phone} gagal: HTTP ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data.tokens.accessToken;
}

/** Header Authorization siap pakai. */
export function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Nomor HP acak yang lolos phoneSchema (`/^\+628\d{7,12}$/`).
 * Dipakai test registrasi — tiap run harus pakai nomor yang belum terdaftar.
 */
export function randomPhone(): string {
  const digits = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  return `0812${digits}`;
}

/**
 * Ambil satu produk aktif yang layak dipakai test keranjang/checkout,
 * lengkap dengan variantId kalau produknya bervarian (addItem menolak
 * varian yang tidak disebut untuk produk bervarian).
 */
export interface ProdukTerbeli {
  productId: string;
  variantId?: string;
  slug: string;
  shopId: string;
  price: number;
}

/**
 * Produk pertama dari sebuah listing yang benar-benar bisa dibeli.
 *
 * **Selalu pakai ini, jangan `items[0]`.** Urutan listing bergeser sepanjang
 * suite (diurutkan antara lain oleh `soldCount`, yang naik tiap test membeli
 * sesuatu), jadi "produk pertama" bukan produk yang sama dari run ke run.
 * Begitu yang kebetulan terpilih adalah produk **bervarian**, menambahkannya ke
 * keranjang tanpa `variantId` membuat checkout ditolak 400 — kegagalan yang
 * muncul di test yang sama sekali tidak sedang menguji varian, dan hanya di CI.
 */
export async function pickBuyableFrom(
  request: APIRequestContext,
  listUrl: string,
): Promise<ProdukTerbeli | null> {
  const list = await request.get(listUrl);
  if (!list.ok()) return null;
  const { data } = await list.json();
  for (const card of data.items ?? []) {
    const detailRes = await request.get(`${V1}/products/${card.slug}`);
    if (!detailRes.ok()) continue;
    const p = (await detailRes.json()).data;
    if (p.stock < 1) continue;
    const variant = (p.variants ?? []).find((v: { stock: number }) => v.stock > 0);
    // Produk bervarian tanpa satu pun varian berstok tidak bisa dibeli.
    if ((p.variants ?? []).length > 0 && !variant) continue;
    return {
      productId: p.id,
      variantId: variant?.id,
      slug: p.slug,
      shopId: p.shop.id,
      price: p.price,
    };
  }
  return null;
}

export async function pickBuyableProduct(request: APIRequestContext): Promise<ProdukTerbeli> {
  const hit = await pickBuyableFrom(request, `${V1}/products?limit=20`);
  if (!hit) throw new Error('Tidak ada produk aktif berstok di katalog — jalankan `npm run db:seed` dulu.');
  return hit;
}