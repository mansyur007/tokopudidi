// remotePatterns diturunkan dari satu daftar host di @tokopudidi/shared supaya
// tidak bisa berbeda dengan yang dipakai SmartImage saat memutuskan optimasi
// (M12-D4). `packages/shared` selalu di-build sebelum web di CI maupun
// Dockerfile, jadi dist-nya pasti ada. Sengaja tanpa try/catch: kalau dist
// hilang, lebih baik build gagal keras daripada allowlist diam-diam kosong dan
// seluruh gambar berhenti dioptimasi tanpa ada yang sadar.
const { ALLOWED_IMAGE_HOSTS } = require('@tokopudidi/shared');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tokopudidi/shared'],
  // OPS-9: `typescript.ignoreBuildErrors` & `eslint.ignoreDuringBuilds` dilepas.
  // Keduanya dipasang saat deploy pertama untuk melewati error yang belum sempat
  // dibereskan; per 2026-08-05 `tsc --noEmit` dan `next lint` sama-sama bersih,
  // jadi bungkamnya sudah tidak menutupi apa pun — hanya menyisakan risiko error
  // baru lolos ke produksi diam-diam. `next build` sekarang kembali jadi gerbang.
  images: {
    remotePatterns: ALLOWED_IMAGE_HOSTS.map((hostname) => ({ protocol: 'https', hostname })),
  },
};

module.exports = nextConfig;
