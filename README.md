# 🛒 Tokopudidi

Marketplace e-commerce **pro rakyat** untuk UMKM kecil Indonesia. Ringan, sederhana, tanpa iklan, tanpa fitur premium yang bikin lemot.

> **Status:** Milestone 7 (Wishlist & Discovery) — wishlist/favorit, "Baru Dilihat", autocomplete pencarian, feed "Untuk Anda" personalized. Plus alat admin **Scraper Tokopedia**.

---

## 📦 Apa yang sudah jadi

- **Milestone 1 — Fondasi:** monorepo (web/api/database/shared), data model lengkap, Auth API (register/login/refresh/logout/OTP mock/reset), shell layout, seed dasar, docker-compose dev.
- **Milestone 2 — Buyer Browse:** katalog produk, pencarian + filter, halaman kategori/produk/toko, keranjang.
- **Milestone 3 — Checkout & Order:** alamat, ongkir per zona, promo, checkout (1 order per toko), pembayaran mock, riwayat & detail pesanan.
- **Milestone 4 — Seller Panel:** dashboard, kelola produk/pesanan, verifikasi bayar, keuangan & pencairan.
- **Milestone 5 — Chat, Ulasan & Notifikasi:** chat realtime (Socket.IO), ulasan produk, notifikasi.
- **Milestone 6 — Admin Panel:** dashboard platform, moderasi pengguna & toko, verifikasi KTP, takedown produk, arbitrase refund (buyer bisa ajukan refund), CRUD banner & kategori.
- **Milestone 7 — Wishlist & Discovery:** wishlist/favorit (heart toggle + halaman `/wishlist`), "Baru Dilihat" (`/baru-dilihat`, guest ke-track via cookie), autocomplete pencarian (produk/kategori/toko + riwayat), feed "Untuk Anda" personalized.
- **Alat admin — Scraper Tokopedia:** halaman `/scrap` (khusus admin) untuk ambil data produk dari URL toko/produk Tokopedia via headless browser, hasil bisa diunduh JSON siap-impor.

Riwayat lengkap tiap milestone ada di [CHANGELOG.md](CHANGELOG.md).

Rencana fitur berikutnya (M7–M15) ada di [ROADMAP.md](ROADMAP.md) — silakan klaim item yang masih `🔵 TODO`.

---

## 🛠️ Stack

| Layer | Pilihan |
|-------|---------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS + Zustand + React Hook Form + Zod |
| Backend | Node.js 20 + Express + TypeScript |
| Database | PostgreSQL 15 + Prisma ORM |
| Cache | Redis 7 |
| Storage | MinIO (dev) → Cloudflare R2 (production) |

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
Edit `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET` jadi string acak panjang.

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
npm run db:migrate -- --name init
```

### 6. Isi data awal
```bash
npm run db:seed
```
Akan dibuat:
- 15 kategori (Sembako, Makanan & Minuman, Fashion Muslim, dst).
- 1 admin: `+6281200000001` / password `admin123`.

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

```bash
npm run test
```

Test unit happy-path saat ini:
- `apps/api/src/modules/auth/auth.test.ts` — validasi schema register/login + normalisasi nomor HP.

---

## 📂 Struktur Project

```
tokopudidi/
├── apps/
│   ├── web/                    # Next.js (buyer + seller + admin nanti)
│   │   └── src/app/(auth)/     # halaman daftar/masuk/lupa-password
│   │   └── src/app/(buyer)/    # halaman pembeli
│   └── api/                    # Express server
│       └── src/modules/auth/   # auth.routes, auth.service, otp.service
├── packages/
│   ├── database/               # Prisma schema + seed
│   └── shared/                 # types & Zod schemas dipakai oleh web+api
├── docker-compose.yml
├── package.json                # workspaces root
└── README.md
```

---

## 🔌 API Endpoints (Milestone 1)

Semua respons format `{ success, data, message?, errors? }`.

| Method | Path                              | Deskripsi |
|--------|-----------------------------------|-----------|
| GET    | `/api/health`                     | Health check |
| POST   | `/api/v1/auth/register`           | Daftar user baru |
| POST   | `/api/v1/auth/login`              | Login dengan HP + password |
| POST   | `/api/v1/auth/refresh`            | Tukar refresh → access token baru |
| POST   | `/api/v1/auth/logout`             | Revoke refresh token |
| POST   | `/api/v1/auth/otp/send`           | Kirim OTP (mock: lihat console) |
| POST   | `/api/v1/auth/otp/verify`         | Verifikasi OTP |
| POST   | `/api/v1/auth/forgot-password`    | Reset password via OTP |
| GET    | `/api/v1/auth/me`                 | Profil user (perlu Bearer token) |
| GET    | `/api/v1/categories`              | Daftar kategori |

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
#    Isi DATABASE_URL (host: postgres), JWT secrets acak, WEB_ORIGIN & NEXT_PUBLIC_API_URL
#    ke URL publik (mis. https://<host>), kredensial MinIO, dll. Lihat .env.example.

# 4. Build & jalankan
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# 5. Migrasi + seed (sekali)
docker compose --env-file .env.production -f docker-compose.prod.yml exec -w /app api \
  npm run prisma:deploy -w @tokopudidi/database
docker compose --env-file .env.production -f docker-compose.prod.yml exec -w /app api \
  npm run db:seed
```

> Catatan: `NEXT_PUBLIC_*` di-_inline_ saat build, jadi setiap ganti URL publik perlu **rebuild** image web.

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
2. **Commit:** Pakai format konvensional: `feat: tambah halaman keranjang`, `fix: validasi nomor HP`, `chore: update deps`.
3. **PR:** Pastikan `npm run lint && npm run test && npm run build` lulus.
4. **Performa > fitur cantik.** Kalau ragu, tanya: "ini bakal jalan di HP entry-level RAM 2GB?"

---

## 📜 Lisensi

MIT — bebas dipakai, dimodifikasi, dijual lagi. Tapi kalau dipakai untuk komersial, kasih kabar ya, biar saling tahu.
