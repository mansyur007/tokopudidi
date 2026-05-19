# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/).
Versi mengikuti [SemVer](https://semver.org/lang/id/).

## [0.5.0] — 2026-05-14 — Milestone 5: Chat, Ulasan & Notifikasi

### Ditambahkan
- **Realtime chat (Socket.IO):**
  - Endpoint `GET/POST /api/v1/chats/rooms`, `GET /rooms/:id/messages`, `POST /rooms/:id/messages`, `POST /rooms/:id/read` — auto-upsert room per pasangan buyer×shop, validasi akses, mark-read otomatis.
  - Server Socket.IO attached ke port 4000 (`ws://localhost:4000`), auth lewat JWT di handshake. Event `room:join`, `room:leave`, `typing`, `message:new`, `message:read`.
  - **Auto-reply** ketika toko tutup: pesan dari buyer di-balas otomatis pakai `shop.autoReplyText`.
  - Notifikasi `NEW_MESSAGE` masuk ke inbox lawan bicara.
- **Halaman chat:**
  - `/chat` (buyer) — 2-pane list room + thread, quick replies, upload gambar (data URL, max 2MB), `?shop=<slug>` auto-open room baru, `?room=<id>` deep-link.
  - `/seller/chat` — versi seller dengan quick replies berbeda, ikut sidebar SellerShell.
  - Komponen `ChatRoom` reusable dengan socket join/leave, optimistic update, typing indicator, status "dibaca".
- **Ulasan / Review:**
  - Endpoint `POST /api/v1/reviews` (buyer, hanya untuk order COMPLETED, satu review per orderItem), `GET /me/pending`, `GET /products/:productId` (filter rating + withImage + pagination), `GET /shops/:shopId`, `POST /:id/reply` (seller, 1× saja, tidak bisa edit).
  - Auto recompute `ratingAvg` + `ratingCount` di Product & Shop tiap ada review baru / edit / hide.
  - Notifikasi otomatis ke seller saat ada ulasan baru.
  - Halaman `/pesanan/ulasan` (buyer) — list item dari order COMPLETED yang belum di-review, modal form rating + komentar + max 3 foto (data URL).
  - Section "Ulasan" lengkap di `/produk/[slug]` — filter chips (Semua / Dengan foto / 1-5⭐), pagination, render balasan penjual.
  - Halaman `/seller/ulasan` — filter rating, balas ulasan inline.
  - CTA "Beri Ulasan" muncul di detail pesanan ketika status `COMPLETED`.
- **Notifikasi:**
  - Endpoint `GET /api/v1/notifications`, `GET /unread-count`, `POST /:id/read`, `POST /read-all`.
  - Komponen `<NotifBell />` di header dengan badge unread (poll 60 detik + refetch on focus).
  - Halaman `/notifikasi` — list 50 terbaru, tap untuk mark-read + navigate ke `linkUrl`, tombol "Tandai Semua Dibaca", grouping per tipe (ORDER_UPDATE / NEW_MESSAGE / PROMO / SYSTEM).
- **Web client:** `lib/socket.ts` Socket.IO singleton dengan reconnect on token change.

### Diperbaiki
- Halaman detail produk tidak lagi menampilkan placeholder "fitur ulasan ada di Milestone 5".

## [0.4.0] — 2026-05-03 — Milestone 4: Seller Panel

### Ditambahkan
- **API endpoints baru:**
  - `POST /api/v1/users/me/upgrade-to-seller` — upgrade BUYER→SELLER dengan auto slug-collision avoidance.
  - Shop self-management: `GET/PATCH /api/v1/seller/shop`, `POST /seller/shop/toggle-open`.
  - `GET /api/v1/seller/dashboard` — pesanan hari ini, pendapatan minggu ini, produk aktif, rating, saldo, 7-day chart, 5 pesanan perlu aksi.
  - Product CRUD seller: list dengan filter (Aktif/Nonaktif/Stok Menipis) + search, get/create/update/delete (soft delete) + duplicate.
  - Order management seller: list per status, detail, process (PAID→PROCESSING), ship (input resi → SHIPPED + pendingBalance increment), mark-delivered, reject (cancel + restore stok + notif buyer).
  - Payment verification: list (PENDING/VERIFIED/REJECTED), approve (set order PAID + notif buyer), reject dengan alasan.
  - Finance: balance + pendingBalance + bank info, withdrawal request (mock auto-PROCESSED setelah 60 detik).
- **Halaman web seller:**
  - Layout shell dengan sidebar persistent (desktop) + drawer (mobile), badge KTP-verified, status buka/tutup.
  - `/seller` dashboard dengan 7 metrics card, SVG bar-chart 7 hari (tanpa lib eksternal), pesanan perlu aksi, banner KTP-pending.
  - `/seller/daftar` wizard 5 step (nama, deskripsi, lokasi, upload KTP, agree TnC) → auto-refresh JWT untuk dapat role SELLER.
  - `/seller/produk` list dengan tab status, search, aksi per item (Edit / Duplikat / Aktif-Nonaktif / Hapus).
  - `/seller/produk/baru` & `/seller/produk/[id]/edit` form lengkap: upload sampai 5 foto (data URL preview), pilih kategori, harga, stok, berat, kondisi, deskripsi, varian dinamis 1-dimensi.
  - `/seller/pesanan` list 7-tab status, card per order.
  - `/seller/pesanan/[id]` detail dengan info buyer + alamat + catatan, aksi adaptif (Proses, input resi → Kirim, Tolak, Tandai Sampai), tombol Print Label.
  - `/seller/pesanan/[id]/print` halaman label A6 monokrom siap-cetak (auto-print on load).
  - `/seller/pembayaran` list bukti transfer 3 tab, preview gambar, warning kalau nominal tidak sesuai, Setujui/Tolak.
  - `/seller/keuangan` saldo aktif (bisa ditarik) + tertahan, form tarik dana ke bank tersimpan, riwayat penarikan.
  - `/seller/pengaturan` profil toko (nama, deskripsi, logo, banner), toggle buka/tutup dengan alasan, rekening pencairan, auto-reply chat.

### Diperbaiki
- Endpoint `/auth/refresh` re-issue token dari DB → setelah upgrade-to-seller, refresh token akan punya role SELLER baru.

## [0.3.0] — 2026-05-02 — Milestone 3: Checkout & Order

### Ditambahkan
- **API endpoints baru:**
  - Address CRUD: `GET/POST/PATCH/DELETE /api/v1/users/me/addresses` — auto-set default kalau alamat pertama, swap default saat update.
  - `POST /api/v1/shipping/quote` — tarif flat per zona (Jabodetabek, Jawa, Luar Jawa) × kg.
  - `GET /api/v1/shipping/options` — cek ketersediaan SAME_DAY dan COD per provinsi.
  - `POST /api/v1/promo/validate` — validasi kode promo dengan min purchase, max discount, expiry, kuota.
  - `POST /api/v1/orders/checkout` — buat order dari cart. **1 order per toko**: kalau buyer pilih item dari 3 toko, jadi 3 order terpisah dengan share discount proporsional. Validasi stok, varian wajib, toko buka, COD-availability. Decrement stok dalam transaction.
  - `GET /api/v1/orders` — list orders dengan filter status & pagination.
  - `GET /api/v1/orders/:id` — detail dengan tracking dummy 4 tahap berdasarkan timestamp shipped.
  - `POST /api/v1/orders/:id/pay` — QRIS mock auto-paid + notifikasi seller.
  - `GET /api/v1/orders/:id/payment-instruction` — QR code dummy + 4 rekening bank dummy.
  - `POST /api/v1/orders/:id/upload-proof` — upload bukti transfer manual.
  - `POST /api/v1/orders/:id/cancel` — cancel + restore stok.
  - `POST /api/v1/orders/:id/complete` — pindah saldo pending → balance toko + increment soldCount.
- **Mock services dengan adapter pattern:**
  - `MockPaymentProvider` (QRIS dummy + 4 rekening bank dummy).
  - Mock shipping zone-based tariff: Jabodetabek Rp9.000/kg, Jawa Rp14.000/kg, Luar Jawa Rp25.000/kg, SAME_DAY hanya Jabodetabek.
- **Halaman web:**
  - `/akun` — menu profil dengan logout.
  - `/akun/alamat` — list alamat + modal form CRUD dengan validasi Zod, bisa set default.
  - `/checkout` — single page sectioned: pilih alamat, kurir per toko, catatan per toko, kode promo (live validate ke server), metode bayar (COD/Transfer/QRIS), ringkasan dinamis, sticky bottom bar.
  - `/pesanan` — tabs status (Semua, Belum Bayar, Diproses, Dikirim, Selesai, Dibatalkan), card per order dengan badge berwarna sesuai status.
  - `/pesanan/[id]` — timeline status visual, tracking dummy untuk SHIPPED, info toko, item, alamat, catatan, ringkasan pembayaran. Aksi sesuai status: Bayar QRIS, Upload Bukti, Batalkan, Selesaikan, Chat Penjual.
  - `/pesanan/[id]/bayar` — daftar 4 rekening tujuan, form upload bukti transfer (preview gambar, validasi MIME + 2MB), data URL untuk demo.
- **Seed data tambahan:** 3 promo code (`HEMAT10K`, `DISKON5`, `GRATISONGKIR`) untuk testing checkout.

### Diperbaiki
- Cart page: tombol "Beli (X)" sekarang menyimpan selected itemIds ke sessionStorage agar dibaca checkout page.

## [0.2.0] — 2026-05-02 — Milestone 2: Buyer Browse

### Ditambahkan
- **API endpoints baru:**
  - `GET /api/v1/products` — list dengan filter (q, kategori, toko, harga, rating, kondisi), 6 jenis sort, pagination.
  - `GET /api/v1/products/:slug` — detail dengan gambar, varian, kategori, info toko.
  - `GET /api/v1/products/:id/related` — produk terkait per kategori/toko.
  - `GET /api/v1/products/suggest?q=` — autocomplete pencarian.
  - `POST /api/v1/products/:id/view` — increment view count.
  - `GET /api/v1/banners?placement=` — banner aktif per placement.
  - `GET /api/v1/shops/featured` — toko pilihan (KTP-verified, sorted by rating).
  - `GET /api/v1/shops/:slug` — detail toko.
  - Cart CRUD: `GET /api/v1/cart`, `POST /api/v1/cart/items`, `PATCH/DELETE /api/v1/cart/items/:id` — auto-create cart, dedup item, validasi stok & varian wajib, auto-group per toko.
- **Halaman web:**
  - Beranda lengkap: banner carousel auto-slide, kategori grid, "Lagi Rame", "Toko UMKM Pilihan", "Khusus Buat Kamu".
  - `/cari` — daftar produk + sort chips + filter rating/kondisi + pagination.
  - `/kategori` & `/kategori/[slug]` — list semua kategori dan halaman kategori detail.
  - `/produk/[slug]` — galeri swipeable, info utama, info toko, variant selector, qty selector dengan validasi stok+min order, deskripsi, related, sticky bottom action bar.
  - `/toko/[slug]` — banner toko, info, list produk.
  - `/keranjang` — group per toko, checkbox per item/toko/all, qty editor, hapus, sticky checkout bar dengan total dinamis.
- **Component reusable:** `ProductCard`, `ProductGrid`, `HorizontalRow`, `BannerCarousel`, `FeaturedShops`, `ProductGallery`, `AddToCartBar`, `SortBar`.
- **State management:** `useCartStore` (Zustand) dengan auto-sync ke server saat user login.
- **Seed data lebih banyak:** 8 toko UMKM + 31 produk realistis (beras, kopi, hijab, kosmetik, sparepart, dll) + 3 banner homepage.

## [0.1.0] — 2026-05-02 — Milestone 1: Foundation

### Ditambahkan
- Setup monorepo dengan workspaces (`apps/web`, `apps/api`, `packages/database`, `packages/shared`).
- Prisma schema lengkap untuk semua entity bisnis (User, Shop, Product, Order, Cart, Chat, Review, dll).
- API endpoint auth: register, login, refresh, logout, OTP mock, reset password, GET /me.
- Halaman Next.js: Beranda placeholder, Daftar, Masuk, Lupa Password.
- Shell layout: Header (search + cart + notif), BottomNav (mobile 5-item), Footer (desktop).
- Mock OTP service yang print kode ke console (siap diganti ke Twilio).
- Seed dasar: 15 kategori UMKM Indonesia + 1 akun admin.
- docker-compose untuk dev (Postgres + Redis + MinIO).
- README lengkap berbahasa Indonesia.
- Unit test happy-path untuk validasi schema auth.
