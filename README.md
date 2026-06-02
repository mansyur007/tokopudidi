# 🛒 Tokopudidi

Marketplace e-commerce **pro rakyat** untuk UMKM kecil Indonesia. Ringan, sederhana, tanpa iklan, tanpa fitur premium yang bikin lemot.

> **Status:** Milestone 6 (Admin Panel) — moderasi pengguna/toko/produk, verifikasi KTP, arbitrase refund, kelola banner & kategori.

---

## 📦 Apa yang sudah jadi

- **Milestone 1 — Fondasi:** monorepo (web/api/database/shared), data model lengkap, Auth API (register/login/refresh/logout/OTP mock/reset), shell layout, seed dasar, docker-compose dev.
- **Milestone 2 — Buyer Browse:** katalog produk, pencarian + filter, halaman kategori/produk/toko, keranjang.
- **Milestone 3 — Checkout & Order:** alamat, ongkir per zona, promo, checkout (1 order per toko), pembayaran mock, riwayat & detail pesanan.
- **Milestone 4 — Seller Panel:** dashboard, kelola produk/pesanan, verifikasi bayar, keuangan & pencairan.
- **Milestone 5 — Chat, Ulasan & Notifikasi:** chat realtime (Socket.IO), ulasan produk, notifikasi.
- **Milestone 6 — Admin Panel:** dashboard platform, moderasi pengguna & toko, verifikasi KTP, takedown produk, arbitrase refund (buyer bisa ajukan refund), CRUD banner & kategori.

Riwayat lengkap tiap milestone ada di [CHANGELOG.md](CHANGELOG.md).

Rencana fitur berikutnya (M7–M12) ada di [ROADMAP.md](ROADMAP.md) — silakan klaim item yang masih `🔵 TODO`.

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

## 🚢 Deploy ke VPS Murah (Biznet/Idcloudhost)

> Detail lengkap ada di Milestone 6. Ringkas:
1. VPS Ubuntu 22.04, RAM minimal 2GB.
2. Install Node 20, Postgres 15, Redis 7, Nginx.
3. Clone repo, `npm install`, `npm run build`.
4. Jalankan API & web pakai PM2: `pm2 start apps/api/dist/index.js --name tkp-api`.
5. Reverse proxy Nginx ke port 3000 (web) dan 4000 (api).
6. SSL pakai Certbot (Let's Encrypt) gratis.

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
