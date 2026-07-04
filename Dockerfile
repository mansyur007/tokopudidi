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
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
# Catatan: API dijalankan via tsx (transpile-only) di runtime — sama seperti dev —
# sehingga tidak perlu `tsc` build untuk api (yang belum lulus strict type-check).
# database & shared tetap di-build karena api & web meng-import dist-nya.
# Hapus .tsbuildinfo basi (sempat ter-commit) supaya tsc incremental tidak skip emit .js.
RUN find . -name '*.tsbuildinfo' -not -path '*/node_modules/*' -delete \
 && npm run db:generate \
 && npm run build -w @tokopudidi/database \
 && npm run build -w @tokopudidi/shared \
 && npm run build -w @tokopudidi/web

# ---------- api runtime ----------
# Catatan: node_modules masih lengkap (termasuk prisma CLI & ts-node) supaya
# bisa menjalankan `prisma migrate deploy` dan seed dari container ini.
FROM base AS api
ENV NODE_ENV=production
# Browser Playwright dipasang ke path tetap agar mudah di-cache & ditemukan runtime.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/packages/database ./packages/database
COPY --from=build /app/apps/api ./apps/api
# Install Chromium + dependency sistem untuk fitur scraper (/admin/scrape).
# --with-deps memasang lib apt yang dibutuhkan headless Chromium di bookworm-slim.
RUN npx playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*
EXPOSE 4000
WORKDIR /app/apps/api
# tsx (esbuild) tersedia di node_modules (devDep api). Transpile-only, tanpa type-check.
CMD ["npx", "tsx", "src/index.ts"]

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
