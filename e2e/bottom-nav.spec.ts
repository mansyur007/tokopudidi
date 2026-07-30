// Bottom nav mobile (M12-A11). Diuji di browser pada viewport mobile karena
// yang penting di sini justru perilaku UI-nya: nav hanya muncul di bawah
// breakpoint md, tab aktif mengikuti rute, dan nav menyingkir di halaman yang
// tombol aksinya menempel di dasar layar.
import { test, expect } from '@playwright/test';
import { tc } from './helpers/testforge';

const MOBILE = { width: 375, height: 812 };
const nav = 'nav[aria-label="Navigasi utama"]';

test.use({ viewport: MOBILE });

test(tc('136', 'Bottom nav tampil di mobile dengan 5 tab'), async ({ page }) => {
  await page.goto('/');

  const bar = page.locator(nav);
  await expect(bar).toBeVisible();

  // Lima tujuan yang dijanjikan susunan tab.
  for (const label of ['Beranda', 'Kategori', 'Wishlist', 'Pesanan', 'Akun']) {
    await expect(bar.getByRole('link', { name: new RegExp(label) })).toBeVisible();
  }

  // Beranda aktif di root.
  await expect(bar.getByRole('link', { name: /Beranda/ })).toHaveAttribute('aria-current', 'page');
});

// Sengaja memakai `/kategori`, BUKAN `/wishlist`. Halaman wishlist melakukan
// `router.push('/masuk')` di useEffect kalau belum ada user, dan browser di
// suite ini tidak login (token hasil global-setup dipakai di level API saja).
// `/masuk` ada di route group (auth) yang tidak punya bottom nav, jadi
// assertion di `/wishlist` cuma menang kalau membaca DOM sebelum redirect
// selesai — lomba yang memang sempat lolos, lalu gagal begitu timing hidrasi
// bergeser sedikit. `/kategori` publik dan tidak pindah ke mana-mana.
test(tc('137', 'Tab aktif mengikuti rute, termasuk rute bersarang'), async ({ page }) => {
  await page.goto('/kategori');
  const bar = page.locator(nav);

  await expect(bar.getByRole('link', { name: /Kategori/ })).toHaveAttribute('aria-current', 'page');
  // Beranda tidak boleh ikut menyala — `/` hanya cocok persis.
  await expect(bar.getByRole('link', { name: /Beranda/ })).not.toHaveAttribute('aria-current', 'page');

  // Rute bersarang tetap menyalakan tab induknya.
  await page.goto('/kategori/sembako');
  await expect(page.locator(nav).getByRole('link', { name: /Kategori/ })).toHaveAttribute(
    'aria-current',
    'page',
  );

  // Tepat satu tab aktif.
  await expect(page.locator(`${nav} [aria-current="page"]`)).toHaveCount(1);
});

test(tc('138', 'Bottom nav menyingkir di alur checkout & chat'), async ({ page }) => {
  // Halaman ini butuh login; tanpa sesi biasanya diarahkan ke /masuk — yang juga
  // bukan halaman ber-nav. Keduanya sama-sama membuktikan nav tidak muncul.
  await page.goto('/checkout');
  await expect(page.locator(nav)).toHaveCount(0);

  await page.goto('/chat');
  await expect(page.locator(nav)).toHaveCount(0);
});

test(tc('139', 'Bottom nav tidak muncul di desktop'), async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  // Elemennya tetap ada di DOM (md:hidden), tapi tidak terlihat.
  await expect(page.locator(nav)).toBeHidden();
});
