# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [SemVer](https://semver.org/).

## [Unreleased] — M9-B2: Toko Voucher

### Added
- **Voucher Toko** (`M9-B2`) — seller bikin voucher khusus tokonya (potongan Rp / diskon %), set min. belanja, kuota total, maks. diskon, dan periode; bisa pause/resume.
  - Schema: `PromoCode.shopId String?` + relasi `Shop.promoCodes` + index `(shopId, isActive)` (migration `m9_b2_promocode_shopid`). `shopId` null = voucher platform.
  - API: `GET/POST/PUT/DELETE /api/v1/seller/voucher` (guard shop owner; kode unik global; PUT `isActive` = pause/resume). Schema shared `voucherCreateSchema`/`voucherUpdateSchema` (dipakai ulang M9-C1).
  - Scoping: `GET /promo/available?shopId=` menyertakan voucher toko tsb (+`shopName` untuk tag 🏪 di picker); `POST /promo/validate` menolak voucher toko tanpa `shopId` cocok; checkout service memotong diskon voucher toko **penuh ke order toko tsb** (basis min. belanja = subtotal toko itu), voucher platform tetap proporsional.
  - FE: halaman `/seller/promo` (list + form modal + pause/resume + hapus) + item sidebar "Voucher Toko"; checkout kirim `shopId` saat 1 toko; picker render tag toko.
  - Catatan: kuota per user deferred (butuh model redemption per-user).

## [Unreleased] — M9-A4: Voucher Picker di Checkout

### Added
- **Voucher Picker** (`M9-A4`) — modal "Pakai Voucher" di checkout: voucher eligible di atas (dengan preview "Hemat Rp X"), ineligible di bawah dengan alasan (belum berlaku / kuota habis / min. belanja), radio select, tombol apply menampilkan preview hemat.
  - API: `GET /api/v1/promo/available?subtotal=` (login) → `{ eligible, ineligible: [{ promo, reason }] }`; param `shopId` disiapkan untuk voucher toko (M9-B2). Apply tetap lewat `POST /promo/validate` existing (validasi server-side tunggal).
  - FE: `components/checkout/VoucherPicker.tsx`; section promo checkout jadi "Voucher & Kode Promo" — tombol **🎟️ Pakai Voucher** + input kode manual tetap ada (fallback, juga tersedia di dalam modal), voucher terpakai dapat tombol **Ganti**.

## [Unreleased] — M8-B6: Template Reply Chat

### Added
- **Template Reply Chat** (`M8-B6`) — seller punya snippet template di composer chat, insert sekali klik, kelola di pengaturan. Menutup **M8** (A3 + A6 + C2 + B6 semua selesai).
  - Schema: model `ChatTemplate` (`shopId`, `label`, `body`, `order`), migration `m8_b6_chat_template`.
  - API: `GET/POST/PUT/DELETE /api/v1/seller/chat-templates` — guard shop owner, max **20 template/toko**, kepemilikan dicek per id (cross-shop → 404).
  - FE: tombol **📋** di composer chat seller → dropdown template, klik = replace isi composer (prop baru `templates` di `ChatRoom`; quick replies statis tetap ada). Section **"Template Chat"** di `/seller/pengaturan` (`ChatTemplateManager`): tambah/edit/hapus + reorder ▲▼.

## [Unreleased] — M8-C2: Report / Pelaporan

### Added
- **Report / Pelaporan** (`M8-C2`) — user bisa melaporkan produk/ulasan/toko/diskusi, admin punya queue arbitrase di `/admin/laporan`.
  - Schema: model `Report` + enum `ReportTargetType` (PRODUCT/REVIEW/SHOP/DISCUSSION/USER) & `ReportStatus` (OPEN/REVIEWING/ACTIONED/DISMISSED), migration `m8_c2_report`.
  - API: `POST /api/v1/reports` (login; validasi target ada, anti-spam 1 laporan OPEN per user per target, laporan REVIEW set `Review.isReported`), `GET /api/v1/admin/reports?status=&type=&page=` (dengan ringkasan target per tipe), `POST /api/v1/admin/reports/:id/resolve` `{ action, note? }`.
  - Resolve ACTIONED otomatis: PRODUCT → takedown (`isActive=false`) + notif ke pemilik toko; REVIEW → `isHidden`; DISCUSSION → soft delete. Pelapor selalu dapat notif keputusan (ACTIONED/DISMISSED).
  - FE: `ReportModal` + `ReportButton` reusable (5 alasan baku `REPORT_REASONS` di shared, deskripsi opsional, bukti max 3 foto @2MB data-URL) — dipasang di detail produk, item ulasan, header toko, item diskusi. Admin: `/admin/laporan` (filter status + tipe, pagination, link ke target) + item sidebar "Laporan".

## [Unreleased] — M8-A6: Order Tracking Timeline + AWB (penyempurnaan)

### Added
- **Order Tracking penyempurnaan** (`M8-A6`) — nama kurir + timestamp per stage di timeline pesanan buyer.
  - Schema: `Order.courierName String?` + `Order.processedAt DateTime?` (migration `m8_a6_order_courier_processed`).
  - API: `POST /seller/orders/:id/process` kini set `processedAt`; `POST /seller/orders/:id/ship` wajib menerima `courierName` (validasi `shipOrderSchema`), notifikasi kirim menyebut kurir.
  - FE buyer (`/pesanan/[id]`): timeline tampilkan **tanggal + jam** per stage (`formatTanggalWaktu` baru di shared), stage "Diproses seller" pakai `processedAt` (fallback `paidAt` untuk order lama), tombol **Salin resi** (clipboard), link **"Lacak di situs kurir"** berdasarkan `courierName` (pola URL publik di `lib/couriers.ts`).
  - FE seller (`/seller/pesanan/[id]`): dropdown **pilih kurir** (10 opsi: JNE, J&T, SiCepat, AnterAja, Ninja, ID Express, Pos, GoSend, GrabExpress, Kurir Toko) di samping input resi; resi + kurir tampil di detail.

## [Unreleased] — M8-A3: Diskusi Produk (Tanya Jawab Publik)

### Added
- **Diskusi Produk** (`M8-A3`) — tab "Diskusi" ke-4 di halaman produk (`InfoTabs`): pertanyaan publik + balasan 1 level, penjual ditandai badge **"Penjual"** otomatis (kalau penulis = pemilik toko), tombol **Membantu** (toggle, optimistic), sort **Terbaru / Paling Membantu**, hapus = **soft delete** (tampil "[Pesan dihapus]").
  - Schema: model `Discussion` (self-relation `parentId` untuk balasan) + `DiscussionHelpful` (`@@id([discussionId, userId])`); enum `NotificationType` tambah `NEW_QUESTION`.
  - API: `GET/POST /api/v1/products/:id/discussions` (list `optionalAuth` untuk `myHelpful`/`isMine`; create login), `POST /api/v1/discussions/:id/reply`, `POST /api/v1/discussions/:id/helpful` (toggle), `DELETE /api/v1/discussions/:id` (pemilik / admin / penjual produk).
  - Notifikasi: `NEW_QUESTION` ke pemilik toko saat pertanyaan baru, dan ke penanya saat pertanyaannya dibalas.
  - FE: `components/product/DiscussionThread.tsx` + client `lib/api/discussions.ts`.

## [Unreleased] — Milestone 7: Wishlist, Recently Viewed & Discovery

### Added
- **Wishlist / Favorit** (`M7-A1`) — heart toggle di `ProductCard` (hover di desktop, selalu tampil di mobile) dan `BuyBox`, halaman `/wishlist` (grid + pagination), badge jumlah di header.
  - Schema: model `Wishlist` (`userId`+`productId` unik).
  - API: `GET/POST/DELETE /api/v1/users/me/wishlist(/:productId)`, plus `/count` dan `/ids` (ringan, untuk cek status di FE tanpa fetch penuh).
  - FE: `store/wishlist.ts` (Zustand, optimistic toggle, mirip pola `store/cart.ts`).
- **Recently Viewed / "Baru Dilihat"** (`M7-A2`) — section horizontal di beranda (tersembunyi jika kosong) dan halaman penuh `/baru-dilihat` dengan hapus per-item.
  - Schema: model `ProductView` (`userId` opsional + `sessionKey` opsional, guest tetap ke-track via cookie).
  - API: `GET/DELETE /api/v1/users/me/recent-products`, endpoint `POST /api/v1/products/:id/view` sekarang juga mencatat `ProductView`.
  - Middleware baru: `optionalAuth` (Bearer opsional) dan `sessionCookie` (cookie `tk_session` httpOnly 30 hari untuk guest).
- **Search Suggestions / Autocomplete** (`M7-A9`) — dropdown pencarian di header (`SearchBar`), debounce 250ms, section Produk/Kategori/Toko + riwayat pencarian (login).
  - Schema: model `SearchHistory`.
  - API: modul `search` baru — `GET /api/v1/search/suggest`, `GET/POST/DELETE /api/v1/search/history`. Menggantikan `GET /api/v1/products/suggest` lama (belum dipakai FE).
- **Personalized "Untuk Anda"** (`M7-D2`) — tab "For You" di beranda kini personalized untuk user login: top-3 kategori dari `ProductView` (30 hari) + riwayat order, exclude produk yang sudah dibeli/dilihat 1 jam terakhir, fallback bestseller global untuk guest atau user tanpa riwayat.
  - API: `GET /api/v1/products/for-you`.

### Changed
- `apps/web/src/lib/api/client.ts`: `apiFetch` kirim `credentials: 'include'` supaya cookie `tk_session` ikut terkirim ke API (beda origin, `cors({ credentials: true })` sudah mendukung ini).

## [Unreleased] — Admin Tools: Scraper Tokopedia

### Added
- **Scraper Tokopedia** (khusus admin) — ambil data produk dari halaman toko (mis. `https://www.tokopedia.com/xiaomi`) atau satu URL produk, tampilkan hasil, dan unduh JSON dalam format yang **selaras dengan form produk Tokopudidi** (siap dipakai untuk impor).
  - Backend: `POST /api/v1/admin/scrape` (guard `requireRole('ADMIN')`), headless Chromium via **Playwright**. Strategi tahan-banting: utamakan baca **JSON-LD** (`schema.org/Product` + `BreadcrumbList`) yang stabil, fallback ke meta `og:` + DOM. Deteksi blokir anti-bot → error yang jelas. Dibatasi `maxProducts` (default 20, maks 40) untuk jaga beban VPS 2-vCPU.
  - Frontend: halaman `/scrap` (guard admin, tautan di sidebar admin) — input URL + jumlah maks, grid hasil, tombol download JSON siap-impor.
  - `packages/shared`: `scrapeRequestSchema`, tipe `ScrapedProduct/ScrapedShop/ScrapeResult` (subset field selaras `productCreateSchema`).
  - `Dockerfile` (stage `api`): pasang Chromium + system deps via `npx playwright install --with-deps chromium`. **Dev lokal**: jalankan `npx playwright install chromium` sekali sebelum memakai fitur.
  - `apps/api/tsconfig.json`: tambah lib `DOM` untuk callback `page.evaluate/$$eval` (konteks browser).

## [Unreleased] — DevOps: Deploy & CI/CD

### Added
- **Deploy produksi via Docker Compose** ke single VPS, di-front **Caddy** (port 80/443) sebagai reverse proxy dengan **HTTPS otomatis** (Let's Encrypt). Live: **https://toko.emha.space**. _(Awalnya pakai hostname `sslip.io` tanpa beli domain; kini sudah pindah ke domain `emha.space`.)_
  - `Dockerfile` multi-stage (target `api` & `web` dari monorepo), `docker-compose.prod.yml` (postgres/redis/minio/api/web/caddy — hanya Caddy yang ekspos publik), `Caddyfile`.
  - API dijalankan via `tsx` (transpile-only) di produksi karena belum lulus `tsc` strict; type/lint di-skip saat `next build` (`ignoreBuildErrors`). Lihat ROADMAP `OPS-9`.
- **CI gate** (`.github/workflows/ci.yml`): `prisma generate` + lint + test + build (database/shared/web) di setiap PR ke `main`.
- **Auto-deploy** (`.github/workflows/deploy.yml`): push/merge ke `main` → SSH ke VPS → `git reset --hard origin/main` → build → **`prisma migrate deploy`** (migrasi otomatis sebelum app naik) → `up -d` → **smoke-test** (`/api/health` + homepage lewat Caddy; gagal = deploy merah). `paths-ignore` agar perubahan dokumentasi tidak men-trigger deploy. Bisa dipicu manual (`workflow_dispatch`).
- **Backup DB harian** (`scripts/backup-db.sh`): `pg_dump` terkompresi + rotasi retensi, dipasang via cron di VPS.

### Changed
- `next.config.js`: hapus `experimental.optimizePackageImports` (merusak resolusi barrel `@tokopudidi/shared` saat build container bersih).

### Fixed
- Build container gagal karena `packages/{shared,database}/tsconfig.tsbuildinfo` **ter-commit** → `tsc --incremental` melewatkan emit `.js` sebagian → dist tidak lengkap. File di-untrack + dibersihkan saat build + di-`.dockerignore`.

### Security
- `.env.production` ditambahkan ke `.gitignore`; secret produksi (JWT/DB/MinIO) di-generate acak dan hanya disimpan di VPS (lihat ROADMAP `OPS-11`).

## [0.6.0] — 2026-05-23 — Milestone 6: Admin Panel

### Added
- **Admin API module** (`/api/v1/admin/*`, all guarded by `requireRole('ADMIN')`):
  - `GET /dashboard` — platform metrics (total users, sellers, shops, active products, today's orders & GMV) plus action queues (shops pending KTP, pending refunds, pending payments, reported reviews) and a 7-day GMV chart.
  - Users: `GET /users` (search + role + status filters, pagination), `POST /users/:id/suspend` (revokes refresh tokens + notifies), `POST /users/:id/unsuspend`.
  - Shops: `GET /shops` (filter by KTP/verified/suspended), `GET /shops/:id` (detail incl. admin-only `ktpUrl`), `POST /shops/:id/verify-ktp`, `POST /shops/:id/suspend` (soft-delete + deactivates products), `POST /shops/:id/unsuspend`.
  - Products: `GET /products` (search + status), `POST /products/:id/takedown` (hides from buyers + notifies seller), `POST /products/:id/restore`.
  - Refunds: `GET /refunds` (filter by status), `POST /refunds/:id/resolve` — approve (restore stock, reverse seller balance/pending balance, set order `REFUNDED`) or reject, with buyer notification.
  - Banners: full CRUD (`GET/POST/PATCH/DELETE /banners`).
  - Categories: full CRUD with slug auto-generation; delete is blocked while products or subcategories still reference the category.
- **Buyer refund flow:** `POST /api/v1/orders/:id/refund` lets a buyer open a refund request for a `DELIVERED`/`COMPLETED` order (one per order), notifying the seller — so admins have real requests to arbitrate.
- **Admin web panel** (`/admin/*`, Bahasa Indonesia UI, role-guarded `AdminShell` with sidebar):
  - `/admin` dashboard with metric cards, action-queue shortcuts, and a 7-day GMV bar chart.
  - `/admin/pengguna` — user list with search/role filter and suspend/unsuspend.
  - `/admin/toko` — shop list + detail modal (KTP image preview), verify KTP, suspend/restore. Honors `?status=PENDING_KTP` deep link from the dashboard.
  - `/admin/produk` — product list with takedown/restore.
  - `/admin/refund` — refund arbitration with order summary, evidence images, approve/reject.
  - `/admin/banner` — banner CRUD with image upload (data URL) or URL.
  - `/admin/kategori` — category CRUD with parent selection.
  - Refund status surfaced on the buyer order detail page (`/pesanan/[id]`) with an "Ajukan Refund" CTA; admin entry point added to `/akun` for `ADMIN` accounts.
- **Seed:** demo buyer (`+6281200000201` / `buyer123`), one `COMPLETED` order, and one `PENDING` refund request so the admin panel is demoable out of the box.

### Fixed
- Pre-existing build blockers from the initial commit (incidental, required for a green build): brittle `Parameters<...>['where']` cast in `seller.payment.routes.ts`; `agreeTerms` literal typing that broke the seller-registration form default; `Link`-without-`href` union in `BannerCarousel`; and missing Suspense boundaries around `useSearchParams()` on `/chat` and `/pesanan`.

## [0.5.0] — 2026-05-14 — Milestone 5: Chat, Reviews & Notifications

### Added
- **Realtime chat (Socket.IO):**
  - Endpoints `GET/POST /api/v1/chats/rooms`, `GET /rooms/:id/messages`, `POST /rooms/:id/messages`, `POST /rooms/:id/read` — auto-upsert a room per buyer×shop pair, access validation, automatic mark-read.
  - Socket.IO server attached to port 4000 (`ws://localhost:4000`), auth via JWT in the handshake. Events `room:join`, `room:leave`, `typing`, `message:new`, `message:read`.
  - **Auto-reply** when the shop is closed: buyer messages are answered automatically using `shop.autoReplyText`.
  - `NEW_MESSAGE` notification delivered to the other party's inbox.
- **Chat pages:**
  - `/chat` (buyer) — 2-pane room list + thread, quick replies, image upload (data URL, max 2MB), `?shop=<slug>` to auto-open a new room, `?room=<id>` deep-link.
  - `/seller/chat` — seller version with different quick replies, embedded in the SellerShell sidebar.
  - Reusable `ChatRoom` component with socket join/leave, optimistic updates, typing indicator, and "read" status.
- **Reviews:**
  - Endpoints `POST /api/v1/reviews` (buyer, only for COMPLETED orders, one review per orderItem), `GET /me/pending`, `GET /products/:productId` (rating + withImage filters + pagination), `GET /shops/:shopId`, `POST /:id/reply` (seller, once only, not editable).
  - Auto-recompute `ratingAvg` + `ratingCount` on Product & Shop whenever a review is added / edited / hidden.
  - Automatic notification to the seller when a new review arrives.
  - `/pesanan/ulasan` page (buyer) — lists items from COMPLETED orders not yet reviewed, modal form with rating + comment + up to 3 photos (data URL).
  - Full "Reviews" section on `/produk/[slug]` — filter chips (All / With photos / 1-5⭐), pagination, renders seller replies.
  - `/seller/ulasan` page — filter by rating, reply to reviews inline.
  - "Write a Review" CTA appears in order details when the status is `COMPLETED`.
- **Notifications:**
  - Endpoints `GET /api/v1/notifications`, `GET /unread-count`, `POST /:id/read`, `POST /read-all`.
  - `<NotifBell />` component in the header with an unread badge (polls every 60 seconds + refetch on focus).
  - `/notifikasi` page — lists the 50 most recent, tap to mark-read + navigate to `linkUrl`, "Mark All Read" button, grouped by type (ORDER_UPDATE / NEW_MESSAGE / PROMO / SYSTEM).
- **Web client:** `lib/socket.ts` Socket.IO singleton that reconnects on token change.

### Fixed
- Product detail page no longer shows the "review feature coming in Milestone 5" placeholder.

## [0.4.0] — 2026-05-03 — Milestone 4: Seller Panel

### Added
- **New API endpoints:**
  - `POST /api/v1/users/me/upgrade-to-seller` — upgrade BUYER→SELLER with automatic slug-collision avoidance.
  - Shop self-management: `GET/PATCH /api/v1/seller/shop`, `POST /seller/shop/toggle-open`.
  - `GET /api/v1/seller/dashboard` — today's orders, this week's revenue, active products, rating, balance, 7-day chart, 5 orders needing action.
  - Seller product CRUD: list with filters (Active/Inactive/Low Stock) + search, get/create/update/delete (soft delete) + duplicate.
  - Seller order management: list per status, detail, process (PAID→PROCESSING), ship (enter tracking number → SHIPPED + pendingBalance increment), mark-delivered, reject (cancel + restore stock + notify buyer).
  - Payment verification: list (PENDING/VERIFIED/REJECTED), approve (set order PAID + notify buyer), reject with reason.
  - Finance: balance + pendingBalance + bank info, withdrawal request (mock auto-PROCESSED after 60 seconds).
- **Seller web pages:**
  - Shell layout with a persistent sidebar (desktop) + drawer (mobile), KTP-verified badge, open/closed status.
  - `/seller` dashboard with 7 metric cards, a 7-day SVG bar chart (no external lib), orders needing action, KTP-pending banner.
  - `/seller/daftar` 5-step wizard (name, description, location, KTP upload, agree to T&C) → auto-refresh JWT to obtain the SELLER role.
  - `/seller/produk` list with status tabs, search, per-item actions (Edit / Duplicate / Activate-Deactivate / Delete).
  - `/seller/produk/baru` & `/seller/produk/[id]/edit` full form: upload up to 5 photos (data URL preview), pick category, price, stock, weight, condition, description, dynamic 1-dimensional variants.
  - `/seller/pesanan` list with 7 status tabs, a card per order.
  - `/seller/pesanan/[id]` detail with buyer info + address + notes, adaptive actions (Process, enter tracking number → Ship, Reject, Mark Delivered), Print Label button.
  - `/seller/pesanan/[id]/print` A6 monochrome print-ready label page (auto-prints on load).
  - `/seller/pembayaran` list of transfer proofs across 3 tabs, image preview, warning when the amount doesn't match, Approve/Reject.
  - `/seller/keuangan` available balance (withdrawable) + held balance, withdrawal form to a saved bank account, withdrawal history.
  - `/seller/pengaturan` shop profile (name, description, logo, banner), open/closed toggle with reason, payout account, chat auto-reply.

### Fixed
- The `/auth/refresh` endpoint re-issues the token from the DB → after upgrade-to-seller, the refresh token will carry the new SELLER role.

## [0.3.0] — 2026-05-02 — Milestone 3: Checkout & Order

### Added
- **New API endpoints:**
  - Address CRUD: `GET/POST/PATCH/DELETE /api/v1/users/me/addresses` — auto-set as default if it's the first address, swap default on update.
  - `POST /api/v1/shipping/quote` — flat rate per zone (Jabodetabek, Java, Outside Java) × kg.
  - `GET /api/v1/shipping/options` — check SAME_DAY and COD availability per province.
  - `POST /api/v1/promo/validate` — validate a promo code against min purchase, max discount, expiry, and quota.
  - `POST /api/v1/orders/checkout` — create an order from the cart. **1 order per shop**: if a buyer picks items from 3 shops, it becomes 3 separate orders with proportional discount sharing. Validates stock, required variants, shop-open status, COD availability. Decrements stock within a transaction.
  - `GET /api/v1/orders` — list orders with status filter & pagination.
  - `GET /api/v1/orders/:id` — detail with a 4-stage dummy tracking based on the shipped timestamp.
  - `POST /api/v1/orders/:id/pay` — QRIS mock auto-paid + seller notification.
  - `GET /api/v1/orders/:id/payment-instruction` — dummy QR code + 4 dummy bank accounts.
  - `POST /api/v1/orders/:id/upload-proof` — upload manual transfer proof.
  - `POST /api/v1/orders/:id/cancel` — cancel + restore stock.
  - `POST /api/v1/orders/:id/complete` — move pending balance → shop balance + increment soldCount.
- **Mock services with adapter pattern:**
  - `MockPaymentProvider` (dummy QRIS + 4 dummy bank accounts).
  - Mock zone-based shipping tariff: Jabodetabek IDR 9,000/kg, Java IDR 14,000/kg, Outside Java IDR 25,000/kg, SAME_DAY for Jabodetabek only.
- **Web pages:**
  - `/akun` — profile menu with logout.
  - `/akun/alamat` — address list + modal CRUD form with Zod validation, can set default.
  - `/checkout` — single sectioned page: pick address, courier per shop, notes per shop, promo code (live server validation), payment method (COD/Transfer/QRIS), dynamic summary, sticky bottom bar.
  - `/pesanan` — status tabs (All, Unpaid, Processing, Shipped, Completed, Cancelled), a card per order with status-colored badges.
  - `/pesanan/[id]` — visual status timeline, dummy tracking for SHIPPED, shop info, items, address, notes, payment summary. Actions per status: Pay with QRIS, Upload Proof, Cancel, Complete, Chat Seller.
  - `/pesanan/[id]/bayar` — list of 4 destination bank accounts, transfer proof upload form (image preview, MIME + 2MB validation), data URL for the demo.
- **Additional seed data:** 3 promo codes (`HEMAT10K`, `DISKON5`, `GRATISONGKIR`) for checkout testing.

### Fixed
- Cart page: the "Buy (X)" button now stores the selected itemIds in sessionStorage so the checkout page can read them.

## [0.2.0] — 2026-05-02 — Milestone 2: Buyer Browse

### Added
- **New API endpoints:**
  - `GET /api/v1/products` — list with filters (q, category, shop, price, rating, condition), 6 sort options, pagination.
  - `GET /api/v1/products/:slug` — detail with images, variants, category, shop info.
  - `GET /api/v1/products/:id/related` — related products by category/shop.
  - `GET /api/v1/products/suggest?q=` — search autocomplete.
  - `POST /api/v1/products/:id/view` — increment view count.
  - `GET /api/v1/banners?placement=` — active banners per placement.
  - `GET /api/v1/shops/featured` — featured shops (KTP-verified, sorted by rating).
  - `GET /api/v1/shops/:slug` — shop detail.
  - Cart CRUD: `GET /api/v1/cart`, `POST /api/v1/cart/items`, `PATCH/DELETE /api/v1/cart/items/:id` — auto-create cart, dedupe items, validate stock & required variants, auto-group per shop.
- **Web pages:**
  - Full home page: auto-sliding banner carousel, category grid, "Trending", "Featured MSME Shops", "Just For You".
  - `/cari` — product list + sort chips + rating/condition filters + pagination.
  - `/kategori` & `/kategori/[slug]` — list of all categories and category detail pages.
  - `/produk/[slug]` — swipeable gallery, key info, shop info, variant selector, qty selector with stock + min-order validation, description, related, sticky bottom action bar.
  - `/toko/[slug]` — shop banner, info, product list.
  - `/keranjang` — grouped per shop, checkbox per item/shop/all, qty editor, delete, sticky checkout bar with dynamic total.
- **Reusable components:** `ProductCard`, `ProductGrid`, `HorizontalRow`, `BannerCarousel`, `FeaturedShops`, `ProductGallery`, `AddToCartBar`, `SortBar`.
- **State management:** `useCartStore` (Zustand) with auto-sync to the server when the user logs in.
- **More seed data:** 8 MSME shops + 31 realistic products (rice, coffee, hijab, cosmetics, spare parts, etc.) + 3 homepage banners.

## [0.1.0] — 2026-05-02 — Milestone 1: Foundation

### Added
- Monorepo setup with workspaces (`apps/web`, `apps/api`, `packages/database`, `packages/shared`).
- Complete Prisma schema for all business entities (User, Shop, Product, Order, Cart, Chat, Review, etc.).
- Auth API endpoints: register, login, refresh, logout, OTP mock, reset password, GET /me.
- Next.js pages: Home placeholder, Register, Login, Forgot Password.
- Shell layout: Header (search + cart + notif), BottomNav (5-item mobile), Footer (desktop).
- Mock OTP service that prints the code to the console (ready to swap to Twilio).
- Basic seed: 15 Indonesian MSME categories + 1 admin account.
- docker-compose for dev (Postgres + Redis + MinIO).
- Complete README (originally in Bahasa Indonesia).
- Happy-path unit tests for auth schema validation.
