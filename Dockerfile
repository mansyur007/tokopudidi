# Multi-stage build untuk monorepo Tokopudidi (api + web).
# Satu Dockerfile, dua target runtime (api, web) — dipilih lewat `target` di compose.

# ---------- base ----------
FROM node:20-bookworm-slim AS base
WORKDIR /app
# openssl dibutuhkan Prisma engine (debian-openssl-3.0.x).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---------- deps (install semua dependency, termasuk dev untuk build) ----------
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

# ---------- build (generate prisma + build semua workspace) ----------
FROM deps AS build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME=Tokopudidi
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
# OPS-9: api ikut di-`tsc` (dulu dilewati karena belum lulus strict type-check,
# lalu dijalankan transpile-only via tsx di runtime). Sekarang build gagal keras
# kalau api tidak lulus type-check — bukan lolos ke produksi lalu meledak saat
# request. database & shared tetap di-build karena api & web meng-import dist-nya.
# Hapus .tsbuildinfo basi (sempat ter-commit) supaya tsc incremental tidak skip emit .js.
RUN find . -name '*.tsbuildinfo' -not -path '*/node_modules/*' -delete \
 && npm run db:generate \
 && npm run build -w @tokopudidi/database \
 && npm run build -w @tokopudidi/shared \
 && npm run build -w @tokopudidi/api \
 && npm run build -w @tokopudidi/web

# ---------- api runtime ----------
# Catatan: node_modules masih lengkap (termasuk prisma CLI & ts-node) supaya
# bisa menjalankan `prisma migrate deploy` dan seed dari container ini.
FROM base AS api
ENV NODE_ENV=production
# Browser Playwright dipasang ke path tetap agar mudah di-cache & ditemukan runtime.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=build /app/node_modules ./node_modules
# Install Chromium + dependency sistem untuk fitur scraper (/admin/scrape).
# --with-deps memasang lib apt yang dibutuhkan headless Chromium di bookworm-slim.
#
# URUTANNYA PENTING — lapisan ini sengaja ditaruh SETELAH node_modules tapi
# SEBELUM kode aplikasi. `npx playwright` butuh node_modules, tapi tidak butuh
# kode kita sama sekali. Sebelumnya lapisan ini berada di bawah semua COPY kode,
# sehingga SETIAP commit membatalkan cache-nya dan memaksa unduh ulang ~98 MB
# paket apt + Chromium. Di VPS ini kecepatan apt bisa turun sampai ~90 KB/s
# (libllvm15 23 MB pernah makan 4+ menit sendirian), dan deploy 2026-07-31
# akhirnya menembus `command_timeout` 25 menit dengan 19,5 menit habis di sini.
# Dengan urutan sekarang, cache-nya hanya batal saat dependency atau schema
# Prisma berubah (client-nya digenerate ke dalam node_modules).
RUN npx playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/packages/database ./packages/database
COPY --from=build /app/apps/api ./apps/api
EXPOSE 4000
WORKDIR /app/apps/api
# OPS-9: jalankan hasil `tsc` (dist/) langsung dengan node, bukan `npx tsx src/index.ts`.
# Yang berjalan di produksi jadi persis artefak yang sudah lulus type-check saat build,
# tanpa lapisan transpile saat start dan tanpa devDependency yang wajib ada di runtime.
# `src/` tetap ikut ter-copy (apps/api utuh) — dipakai `npm run test` bila perlu dari
# container, tapi tidak lagi menjadi yang dieksekusi.
CMD ["node", "dist/index.js"]

# ---------- web runtime ----------
FROM base AS web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/web ./apps/web
EXPOSE 3000
WORKDIR /app/apps/web
CMD ["npm", "run", "start"]
