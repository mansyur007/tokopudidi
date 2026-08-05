// Generator ikon PWA (M15-D1) — SEKALI JALAN, hasilnya (PNG) yang di-commit.
//
// Sengaja TIDAK menambah `sharp` ke devDependencies: dia menarik binary
// platform-specific ~30 MB yang akan ikut ter-install di CI dan di image
// Docker setiap build, padahal cuma dipakai sekali seumur fitur. Jalankan
// ad-hoc waktu ikonnya berubah:
//
//   npm i --no-save sharp && node scripts/generate-pwa-icons.mjs
//
// Sumber kebenaran ikon tetap satu: apps/web/src/app/icon.svg (favicon brand).
// Varian maskable diturunkan dari file yang sama lewat transform yang
// di-assert di bawah — bukan salinan SVG kedua yang bisa diam-diam berbeda.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps/web/src/app/icon.svg');
const OUT = path.join(ROOT, 'apps/web/public');

// Latar rounded-rect di icon.svg. Untuk varian maskable sudutnya harus dilepas:
// launcher yang memotong ikon (Android) menerapkan mask-nya sendiri, dan sudut
// membulat bawaan menghasilkan celah transparan di dalam mask.
const ROUNDED_BG = '<rect width="32" height="32" rx="7" fill="#1FA463"/>';
const SQUARE_BG = '<rect width="32" height="32" fill="#1FA463"/>';

const source = await readFile(SRC, 'utf8');
if (!source.includes(ROUNDED_BG)) {
  throw new Error(
    `icon.svg berubah: latar "${ROUNDED_BG}" tidak ditemukan. ` +
      'Perbarui ROUNDED_BG/SQUARE_BG di script ini sebelum regenerate — ' +
      'kalau tidak, varian maskable akan lahir dengan sudut membulat.',
  );
}
const maskable = source.replace(ROUNDED_BG, SQUARE_BG);

// Glyph di icon.svg diskalakan 0.64 terhadap titik tengah, jadi bounding box-nya
// berjarak maksimum ~9.6/16 dari pusat — masih di dalam safe zone maskable
// (radius 40% kanvas = 12.8/16). Tidak perlu padding tambahan.
await mkdir(OUT, { recursive: true });

const targets = [
  { svg: source, size: 192, file: 'icon-192.png' },
  { svg: source, size: 512, file: 'icon-512.png' },
  { svg: maskable, size: 192, file: 'icon-maskable-192.png' },
  { svg: maskable, size: 512, file: 'icon-maskable-512.png' },
];

for (const { svg, size, file } of targets) {
  const png = await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(OUT, file), png);
  console.log(`${file.padEnd(24)} ${String(png.length).padStart(7)} B`);
}
