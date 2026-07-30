# 🛒 Tokopudidi

Marketplace e-commerce **pro rakyat** untuk UMKM kecil Indonesia. Ringan, sederhana, tanpa iklan, tanpa fitur premium yang bikin lemot.

> **Status:** Milestone 12 **selesai** — M8–M12 kelar; berikutnya M13–M15. **🌐 Live:** https://toko.emha.space

---

## 📦 Apa yang sudah jadi

- **Milestone 1 — Fondasi:** monorepo (web/api/database/shared), data model lengkap, Auth API (register/login/refresh/logout/OTP mock/reset), shell layout, seed dasar, docker-compose dev.
- **Milestone 2 — Buyer Browse:** katalog produk, pencarian + filter, halaman kategori/produk/toko, keranjang.
- **Milestone 3 — Checkout & Order:** alamat, ongkir per zona, promo, checkout (1 order per toko), pembayaran mock, riwayat & detail pesanan.
- **Milestone 4 — Seller Panel:** dashboard, kelola produk/pesanan, verifikasi bayar, keuangan & pencairan.
- **Milestone 5 — Chat, Ulasan & Notifikasi:** chat realtime (Socket.IO), ulasan produk, notifikasi.
- **Milestone 6 — Admin Panel:** dashboard platform, moderasi pengguna & toko, verifikasi KTP, takedown produk, arbitrase refund (buyer bisa ajukan refund), CRUD banner & kategori.
- **Milestone 7 — Wishlist & Discovery:** wishlist/favorit (heart toggle + halaman `/wishlist`), "Baru Dilihat" (`/baru-dilihat`, guest ke-track via cookie), autocomplete pencarian (produk/kategori/toko + riwayat), feed "Untuk Anda" personalized.
- **Milestone 8 — Interaksi & Kepercayaan:** diskusi produk (tanya jawab publik), timeline tracking pesanan + AWB, pelaporan produk/toko, template reply chat penjual.
- **Milestone 9 — Promo & Diskon:** voucher picker di checkout, voucher toko, harga diskon periodik (sale price), voucher platform global.
- **Milestone 10 — Pembayaran & Sengketa:** QRIS mock lengkap (render QR + countdown + expiry), komplain/return di luar refund, filter pencarian lengkap.
- **Milestone 11 — Toko & Varian:** etalase/showcase toko (tab produk di halaman toko), statistik per produk, varian kombinasi multi-axis (mis. Warna × Ukuran).
- **Milestone 12 — Polish, SEO & Audit:** bottom nav mobile, SEO & metadata (sitemap dinamis, robots, Open Graph, JSON-LD produk), audit optimasi gambar, dan jejak audit aksi admin (`/admin/log`).
- **Alat admin — Scraper Tokopedia:** halaman `/scrap` (khusus admin) untuk ambil data produk dari URL toko/produk Tokopedia via headless browser, hasil bisa diunduh JSON siap-impor.

Riwayat lengkap tiap milestone ada di [CHANGELOG.md](CHANGELOG.md).

Rencana fitur berikutnya (M12–M15) ada di [ROADMAP.md](ROADMAP.md) — silakan klaim item yang masih `🔵 TODO`. Rencana test automation ada di [TESTING.md](TESTING.md).

**Utang teknis yang masih terbuka:** kolom `ProductVariant.name` belum di-drop (tahap 4 M11-A8, menunggu verifikasi backfill di produksi), dan belum ada endpoint upload berkas — semua gambar unggahan disimpan sebagai data-URI base64 di kolom string.

---

## 🛠️ Stack

| Layer | Pilihan |
|-------|---------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS + Zustand + React Hook Form + Zod |
| Backend | Node.js 20 + Express + TypeScript |
| Database | PostgreSQL 15 + Prisma ORM |
| Cache | Redis 7 |
| Storage | MinIO ikut jalan di compose, **tapi belum dipakai** — belum ada endpoint upload berkas, gambar unggahan masih disimpan sebagai data-URI base64 di kolom string |
| Test | Vitest (unit, `apps/api`) + Playwright (E2E) |

---

## 🚀 Cara Setup di Lokal

### 1. Prasyarat
- Node.js >= 20 (cek: `node -v`)
- npm >= 10
- Docker + Docker Compose

### 2. Clone & Install
```bash
git clone https://github.com/mansyur007/tokopudidi.git tokopudidi
cd tokopudidi
npm install
```

### 3. Salin file environment
```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
```
Edit `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET` jadi string acak panjang. Nilai default lainnya sudah cocok untuk dev.

### 4. Jalankan database & service
```bash
docker compose up -d
```
Tunggu sampai postgres ready (~10 detik). Cek dengan:
```bash
docker compose ps
```

### 5. Migrasi database
```bash
npm run db:generate
npm run db:migrate
```
Migration-nya sudah ter-commit, jadi `db:migrate` (`prisma migrate dev`) tinggal menerapkannya — tidak perlu `--name`.

### 6. Isi data awal
```bash
npm run db:seed
```
Akan dibuat kategori, produk contoh (termasuk produk bervarian multi-axis), dan tiga akun seed:

| Peran | Nomor HP | Password |
|---|---|---|
| Admin | `+6281200000001` | `admin123` |
| Seller | `+6281200000101` | `seller123` |
| Buyer | `+6281200000201` | `buyer123` |

Akun-akun inilah yang dipakai suite E2E ([e2e/helpers/testforge.ts](e2e/helpers/testforge.ts)).

### 7. Jalankan aplikasi
```bash
npm run dev
```
- Web: http://localhost:3000
- API: http://localhost:4000
- Health check: http://localhost:4000/api/health

### 8. (Opsional) Preview ke publik via Cloudflare Tunnel

Untuk demo / kolaborasi remote, ekspos dev server lewat tunnel sementara
([cloudflared Quick Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/)).
Tidak perlu akun Cloudflare; URL random aktif selama proses jalan.

```bash
# Prasyarat
brew install cloudflared
jq --version            # untuk baca tunnel-urls.json

# Pastikan dev server sudah jalan (langkah 7) — script akan exit kalau lokal belum siap
./scripts/tunnel.sh                          # foreground, Ctrl+C untuk stop
# atau jalankan di latar belakang:
nohup ./scripts/tunnel.sh > tunnel.out 2>&1 &
```

Apa yang script lakukan:
- Spawn 2 tunnel paralel (web :3000 + api :4000) ke `*.trycloudflare.com`.
- Tulis URL aktif ke `tunnel-urls.json` (gitignored), update otomatis kalau URL berubah.
- Sinkronkan `apps/web/.env.local` (`NEXT_PUBLIC_API_URL`) & `apps/api/.env`
  (`WEB_ORIGIN`) supaya web SSR & CORS API ngarah ke tunnel publik.
- Health-check setiap 30 detik; restart tunnel mati setelah 3× gagal beruntun.

Setelah script baru pertama kali jalan **atau saat URL berubah** (terlihat di
`tunnel.log`), restart dev server biar Next.js & Express baca env baru:

```bash
# Hentikan dev lama, jalankan ulang
pkill -f 'next dev'; pkill -f 'tsx watch'
npm run dev
```

Cek URL publik kapan saja:
```bash
cat tunnel-urls.json
# {
#   "web": "https://....trycloudflare.com",
#   "api": "https://....trycloudflare.com",
#   "updatedAt": "..."
# }
```

Stop tunnel: `pkill -f 'scripts/tunnel.sh'` (cleanup handler akan kill kedua
subprocess cloudflared).

> ⚠️ Quick Tunnel = URL random, putus saat script berhenti, **bukan untuk
> production**. Untuk URL stabil, pakai [Named Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/)
> dengan akun Cloudflare.

---

## 🧪 Testing

### Unit (Vitest, di `apps/api`)
```bash
npm run test
```
183 test di 10 berkas — semuanya logika murni tanpa DB: normalisasi nomor HP & schema auth, harga efektif produk, kombinasi varian, urutan etalase, statistik produk, helper SEO, klasifikasi sumber gambar, dan redaksi payload jejak audit.

> `apps/web` **belum punya test runner.** Karena itu logika murni yang dipakai FE ditaruh di `packages/shared/src/utils/` supaya ikut teruji suite `apps/api`; perilaku UI-nya diuji lewat Playwright.

### E2E (Playwright)
Butuh Postgres + web + api jalan (langkah 4–7 di atas).
```bash
npm run e2e          # headless
npm run e2e:ui       # mode UI
```
Nama tiap test memuat id `TC-TKPDD-<n>` supaya hasilnya ter-map ke test case di TestForge — lihat [e2e/helpers/testforge.ts](e2e/helpers/testforge.ts). Suite ini berjalan **serial** (`workers: 1`) karena berbagi data seed, dan login dilakukan sekali di `global-setup` (API membatasi 5 login/menit/IP).

### CI
- [ci.yml](.github/workflows/ci.yml) — `prisma generate` → build `database` + `shared` → lint → test → build web.
- [e2e.yml](.github/workflows/e2e.yml) — spin up `postgres:15`, `prisma:deploy`, `db:seed`, lalu jalankan Playwright.

Rencana pengembangan test lebih lanjut ada di [TESTING.md](TESTING.md).

---

## 📂 Struktur Project

```
tokopudidi/
├── apps/
│   ├── web/                      # Next.js 14 App Router
│   │   └── src/app/(auth)/       # daftar / masuk / lupa-password
│   │   └── src/app/(buyer)/      # halaman pembeli
│   │   └── src/app/seller/       # panel penjual
│   │   └── src/app/admin/        # panel admin
│   │   └── src/app/scrap/        # scraper Tokopedia (admin)
│   │   └── src/components/       # per domain: product, shop, order, chat, seller, admin, media, shell
│   │   └── src/lib/api/          # client fetch per domain (cache: 'no-store')
│   │   └── src/store/            # Zustand (auth, cart, wishlist, …)
│   └── api/                      # Express, dijalankan via tsx (tanpa build)
│       └── src/modules/<domain>/ # *.routes.ts, *.service.ts, *.test.ts berdampingan
│       └── src/middleware/       # auth, optionalAuth, requireRole, validateBody, rate limit
├── packages/
│   ├── database/                 # Prisma schema, migration, seed
│   └── shared/                   # Zod schema + util murni, dipakai web & api
├── e2e/                          # Playwright + helpers TestForge
├── scripts/                      # tunnel.sh, upload-junit.mjs, backfill-*.mjs
├── Dockerfile                    # multi-stage, target `api` & `web`
├── docker-compose.yml            # dev: postgres, redis, minio
├── docker-compose.prod.yml       # produksi + caddy
└── playwright.config.ts
```

---

## 🔌 Konvensi API

- Base path `/api/v1/…`, health check di `/api/health`.
- Semua respons berformat `{ success, data, message?, errors? }`.
- Auth pakai Bearer access token (JWT) + refresh token; peran `BUYER` / `SELLER` / `ADMIN` dijaga `requireRole`.
- Body divalidasi `validateBody(<zodSchema>)` dengan schema dari `@tokopudidi/shared` — schema yang sama dipakai FE, jadi validasi client & server tidak bisa berbeda.
- Endpointnya sudah ~40 berkas route; daftar lengkapnya tidak diduplikasi di sini karena cepat basi. Sumber yang akurat: registrasi router di [apps/api/src/app.ts](apps/api/src/app.ts) lalu berkas `*.routes.ts` di modul yang bersangkutan.

---

## ⚠️ Aturan kode yang mudah kelewat

Empat hal yang bikin PR gagal atau bug halus kalau dilewatkan:

1. **Render gambar lewat `SmartImage`**, bukan `<img>` atau `next/image` langsung ([apps/web/src/components/media/SmartImage.tsx](apps/web/src/components/media/SmartImage.tsx)). URL gambar di aplikasi ini bisa data-URI, bisa host sembarang yang ditempel seller — `next/image` menolak host di luar `remotePatterns` (halaman 500 di dev, gambar 400 di produksi). Kalau perlu menambah host, tambahkan ke `ALLOWED_IMAGE_HOSTS` di `packages/shared/src/utils/image.ts`; `next.config.js` menurunkan `remotePatterns` dari situ.
2. **`packages/shared` & `packages/database` dikonsumsi sebagai `dist` hasil build.** Setelah mengubahnya, jalankan `npm run build -w @tokopudidi/shared` (atau `-w @tokopudidi/database`) sebelum berharap `apps/web`/`apps/api` melihat perubahannya.
3. **Logika murni yang dipakai FE ditaruh di `packages/shared/src/utils/`.** `apps/web` belum punya test runner, jadi itulah satu-satunya cara logikanya ikut teruji.
4. **Migration ditulis manual, lalu diverifikasi** terhadap keluaran `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`. Jangan jalankan `prisma format` — formatter-nya menyentuh ratusan baris yang tidak berkaitan dan membuat diff-nya tidak bisa ditinjau.
5. **Endpoint tulis admin baru wajib memanggil `logAdmin`** ([lib/adminLog.ts](apps/api/src/lib/adminLog.ts)), dengan nama aksinya didaftarkan di `ADMIN_ACTIONS`. Ada test yang gagal kalau aksi terdaftar tidak punya call site — tapi arah sebaliknya (endpoint baru yang tidak mencatat apa pun) hanya bisa dijaga oleh reviewer, jadi tolong diperiksa saat review.

---

## 📱 OTP Mock di Dev

Selama `OTP_MOCK=true`, kode OTP **tidak dikirim ke SMS sungguhan**. Saat kamu trigger `POST /api/v1/auth/otp/send`, kode 6 digit akan tercetak di terminal API:

```
📱 OTP untuk +6281234567890 (REGISTER): 482910
```

Pakai kode itu untuk verifikasi. Untuk production, ganti `MockOtpProvider` di `apps/api/src/modules/auth/otp.service.ts` dengan adapter Twilio/Vonage.

---

## 🚢 Deploy ke VPS (Docker Compose + Caddy)

Deploy produksi pakai **Docker Compose** di single VPS, di-front oleh **Caddy** (port 80/443) sebagai reverse proxy dengan **HTTPS otomatis** (Let's Encrypt).

**🌐 Live:** https://toko.emha.space

### Arsitektur
- `Dockerfile` — multi-stage, satu image untuk target `api` & `web` dari monorepo.
- `docker-compose.prod.yml` — `postgres`, `redis`, `minio`, `api`, `web`, `caddy`. Hanya Caddy yang ekspos port publik.
- `Caddyfile` — route `/api/*` & `/socket.io/*` → `api:4000`, sisanya → `web:3000`. Host `toko.emha.space` dapat sertifikat Let's Encrypt otomatis dari Caddy.

### Setup pertama kali di VPS (Ubuntu)
```bash
# 1. Install Docker + Compose plugin (lihat docs.docker.com), tambah swap kalau RAM < 2GB
# 2. Clone repo
git clone https://github.com/mansyur007/tokopudidi.git /opt/tokopudidi
cd /opt/tokopudidi

# 3. Buat .env.production (JANGAN commit — sudah di .gitignore).
#    Isi DATABASE_URL (host: postgres), JWT secrets acak, WEB_ORIGIN,
#    NEXT_PUBLIC_API_URL dan NEXT_PUBLIC_SITE_URL ke URL publik
#    (mis. https://toko.emha.space), kredensial MinIO, dll. Lihat .env.example.

# 4. Build & jalankan
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# 5. Migrasi + seed (sekali)
docker compose --env-file .env.production -f docker-compose.prod.yml exec -w /app api \
  npm run prisma:deploy -w @tokopudidi/database
docker compose --env-file .env.production -f docker-compose.prod.yml exec -w /app api \
  npm run db:seed
```

> Catatan: `NEXT_PUBLIC_*` di-_inline_ saat build, jadi setiap ganti URL publik perlu **rebuild** image web. `NEXT_PUBLIC_SITE_URL` sudah diteruskan sebagai build arg **dan** runtime env di `docker-compose.prod.yml`; kalau kosong, canonical/Open Graph/sitemap menunjuk `localhost` dan diabaikan crawler.

### Auto-deploy (CI/CD)
Setiap **push/merge ke `main`** memicu GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) yang SSH ke VPS lalu:
```bash
git fetch origin main && git reset --hard origin/main
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```
`reset --hard` tidak menyentuh `.env.production` (untracked), jadi secret aman. Workflow butuh repo secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`. Bisa juga dipicu manual via tab **Actions** → *Run workflow*.

### Update manual (kalau perlu)
```bash
cd /opt/tokopudidi && git pull && \
  docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

---

## 🤝 Berkontribusi

Project ini terbuka untuk developer Indonesia yang mau bantu UMKM. Aturan main singkat:

1. **Bahasa:** UI dan komentar untuk user → Bahasa Indonesia santai. Komentar teknis → English boleh.
2. **Satu item ROADMAP = satu PR.** Klaim dulu dengan mengisi **Owner** + Status `🟡 IN PROGRESS` di [ROADMAP.md](ROADMAP.md).
3. **Penamaan** mengikuti ID item roadmap:
   - Branch: `feat/M12-D4-image-optimization`
   - Commit: `feat(M12-D4): ringkasan singkat`
   - Judul PR: `M12-D4 Image Optimization Audit`
4. **Sebelum PR:** update Status + tulis **Deliver notes** di ROADMAP, tambahkan entri [CHANGELOG.md](CHANGELOG.md), lalu pastikan gerbang ini lulus:
   ```bash
   npm run lint && npm run test && npm run build
   ```
5. **Performa > fitur cantik.** Kalau ragu, tanya: "ini bakal jalan di HP entry-level RAM 2GB?" Menambah dependency berat untuk kebutuhan kecil (mis. library chart untuk 30 batang) bukan pilihan — dan lihat juga **Scope guard** di ROADMAP untuk fitur yang sudah diputuskan di luar lingkup.

---

## 📜 Lisensi

MIT — bebas dipakai, dimodifikasi, dijual lagi. Tapi kalau dipakai untuk komersial, kasih kabar ya, biar saling tahu.
