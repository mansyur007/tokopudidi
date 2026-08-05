// PWA / installability (M15-D1). Kriteria "installable" ditegakkan browser dari
// manifest + ikon yang BENAR-BENAR tersaji, bukan dari isi repo — jadi yang
// diuji di sini keluaran HTTP-nya, bukan file sumbernya.
import { test, expect } from '@playwright/test';
import { tc, WEB_URL } from './helpers/testforge';

/** Baca lebar/tinggi dari chunk IHDR PNG (byte 16..24). Tanpa dependency gambar. */
function pngSize(buf: Buffer): { width: number; height: number } {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(buf.subarray(0, 8).equals(signature), 'bukan berkas PNG').toBe(true);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test(tc('186', 'Manifest PWA tersaji lengkap & installable'), async ({ request }) => {
  const res = await request.get(`${WEB_URL}/manifest.webmanifest`);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('manifest+json');

  const m = await res.json();

  expect(m.name).toBeTruthy();
  expect(m.short_name).toBeTruthy();
  expect(m.start_url).toBe('/');
  // Tanpa `standalone`/`fullscreen`/`minimal-ui`, Chrome tidak menganggapnya
  // aplikasi yang bisa dipasang — dia cuma pintasan browser.
  expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(m.display);
  expect(m.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  expect(m.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);

  // Syarat minimum Chrome: ada ikon 192 DAN 512.
  const anyIcons = m.icons.filter((i: { purpose?: string }) => i.purpose === 'any');
  expect(anyIcons.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );

  // Maskable wajib entri sendiri: dipakai launcher Android yang memotong ikon.
  // Kalau ini hilang, Android menempelkan ikon "any" ke dalam badge putih.
  const maskable = m.icons.filter((i: { purpose?: string }) => i.purpose === 'maskable');
  expect(maskable.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
});

test(tc('187', 'Setiap ikon manifest benar-benar ada & seukuran deklarasinya'), async ({
  request,
}) => {
  const m = await (await request.get(`${WEB_URL}/manifest.webmanifest`)).json();
  expect(m.icons.length).toBeGreaterThan(0);

  for (const icon of m.icons as { src: string; sizes: string; type: string }[]) {
    // 404 di sini bukan hipotetis: ikon tinggal di apps/web/public/, folder yang
    // baru lahir di M15-D1 — kalau suatu saat tidak ikut ter-copy ke image
    // produksi, manifest tetap sah tapi aplikasi berhenti installable.
    const res = await request.get(`${WEB_URL}${icon.src}`);
    expect(res.status(), `${icon.src} tidak tersaji`).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');

    const [w, h] = icon.sizes.split('x').map(Number);
    const real = pngSize(await res.body());
    expect(real, `${icon.src} tidak seukuran ${icon.sizes}`).toEqual({ width: w, height: h });
  }
});

test(tc('188', '<head> menautkan manifest sekali & warna temanya sama'), async ({
  page,
  request,
}) => {
  await page.goto('/');

  // Ada — ini yang jatuh ke 0 kalau `app/manifest.ts` hilang atau berpindah
  // nama; tanpa tag ini browser tidak pernah membaca manifest-nya sama sekali.
  // Dan tepat satu: yang menyisipkannya Next sendiri, jadi <link> tulisan
  // tangan di layout mana pun akan menumpuk di atasnya.
  const links = page.locator('link[rel="manifest"]');
  await expect(links).toHaveCount(1);
  const href = await links.getAttribute('href');
  expect(href).toBe('/manifest.webmanifest');

  // theme-color muncul dua kali dengan nilai berbeda = bilah judul aplikasi
  // terinstal berwarna lain dari header yang dirender di dalamnya.
  const themeMetas = page.locator('meta[name="theme-color"]');
  await expect(themeMetas).toHaveCount(1);

  const m = await (await request.get(`${WEB_URL}/manifest.webmanifest`)).json();
  expect((await themeMetas.getAttribute('content'))?.toLowerCase()).toBe(
    String(m.theme_color).toLowerCase(),
  );
});
