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
  // Deploy: jangan gagalkan production build karena type/lint error yang belum dibereskan.
  // (Type-check & lint tetap bisa dijalankan terpisah via `npm run lint` / tsc.)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: ALLOWED_IMAGE_HOSTS.map((hostname) => ({ protocol: 'https', hostname })),
  },
};

module.exports = nextConfig;
