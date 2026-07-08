# 🗺️ Tokopudidi — Roadmap M7–M15

> **Status dokumen**: Draft 2 · Terakhir di-update: **2026-07-05**
> **Sumber kebenaran** untuk milestone setelah M6. Setiap item adalah unit pekerjaan yang bisa di-klaim per orang/tim.
>
> **Progress terbaru (2026-07-07)** — **M8 selesai & merged ke `main`**: A3 Diskusi Produk ([PR #18](https://github.com/mansyur007/tokopudidi/pull/18)), A6 Order Tracking + AWB ([PR #21](https://github.com/mansyur007/tokopudidi/pull/21)), C2 Report/Pelaporan ([PR #22](https://github.com/mansyur007/tokopudidi/pull/22)), B6 Template Reply Chat. Milestone berikutnya yang bebas di-klaim: **M9**.
>
> **Progress (2026-07-05)** — **M7 selesai & merged ke `main`** ([PR #16](https://github.com/mansyur007/tokopudidi/pull/16)): A1 Wishlist, A2 Recently Viewed, A9 Search Autocomplete, D2 "Untuk Anda" personalized. Catatan: halaman final di-deliver ke `/wishlist` & `/baru-dilihat` (bukan di bawah `/akun/...` seperti rencana awal).
>
> **Perubahan Draft 2 (2026-07-03)** — hasil audit kode vs fitur Tokopedia:
> - Koreksi item basi: COD + QRIS mock + timeline order + input resi **sudah terimplementasi** sejak M3/M4 — scope M8-A6 & M10-A5 dipersempit jadi delta yang tersisa.
> - Mode libur toko (`Shop.isOpen` + auto-reply) dan share produk (Web Share API) sudah ada — tidak perlu item baru.
> - Milestone baru **M13–M15**: follow toko, invoice, harga grosir, broadcast, login Google, email transaksional, badge reputasi, bulk edit, flash sale, pre-order, PWA.

## Cara baca dokumen ini

- Setiap fitur punya **ID** (mis. `M7-A1`) — pakai ID ini di nama branch (`feat/M7-A1-wishlist`), commit, dan PR.
- Setiap fitur punya **Status**, **Owner**, **Scope**, **Schema**, **API**, **UI**, **Acceptance**, **Effort**.
- **Effort**: S = ≤1 hari · M = 2–3 hari · L = 4+ hari (1 orang full-time).
- Update status & owner di sini setiap kali ambil/selesai pekerjaan, commit perubahan dokumen bersama PR fitur.

### Status legend

| Badge | Arti |
|---|---|
| 🔵 `TODO` | Belum dimulai, bebas di-klaim |
| 🟡 `IN PROGRESS` | Sedang dikerjakan oleh Owner |
| 🟢 `DONE` | Sudah merged & deployed |
| ⚪ `BLOCKED` | Menunggu dependensi (sebutkan apa) |
| 🔴 `DROPPED` | Dibatalkan / di luar lingkup |

---

## Konteks: yang sudah ada (M1–M7)

Auth, katalog + search + kategori, cart, checkout (1-order-per-toko), payment **COD / transfer manual / QRIS mock** + bukti bayar, alamat, ongkir per zona (REGULAR/SAME_DAY), promo code, riwayat order + cancel, timeline status order + input/display nomor resi dasar, seller panel (produk/order/keuangan/withdrawal/ulasan), mode libur toko (`Shop.isOpen` + `closedReason` + auto-reply chat saat tutup), share produk (Web Share API di BuyBox), chat realtime, ulasan, notifikasi, admin (user/shop/KTP/produk-takedown/refund/banner/kategori). **M7:** wishlist/favorit (model `Wishlist`), "Baru Dilihat" (model `ProductView`, guest via cookie `tk_session`), autocomplete pencarian (model `SearchHistory`, modul `search`), feed "Untuk Anda" personalized (`GET /products/for-you`). Plus alat admin **Scraper Tokopedia** (`/scrap`, Playwright).

Riwayat detail per milestone di [CHANGELOG.md](CHANGELOG.md).

---

## ⚖️ Scope guard (keputusan global)

Hal-hal berikut **eksplisit di luar lingkup MVP** — jangan dikerjakan tanpa diskusi ulang:

| Out-of-scope | Alasan |
|---|---|
| Payment selain `COD`, `TRANSFER_MANUAL` & `QRIS_MOCK` (VA, e-wallet, kartu, paylater, cicilan) | Fokus 3 metode existing untuk MVP. QRIS pakai mock. |
| Web Push Notifications (browser push) | In-app notif (existing) sudah cukup |
| Bulk import produk via CSV | Nice-to-have, overhead besar |
| TopUp & Tagihan real (pulsa, listrik, BPJS) | Hero card kanan boleh tetap UI mock atau dijadikan "Coming Soon" |
| Live shopping / video review | Bukan core marketplace |
| Sponsored ads (TopAds) | Bukan core marketplace |

---

## A. Milestone M7–M12

### M7-A1. Wishlist / Favorit ⭐
- **Status**: 🟢 DONE
- **Owner**: Claude
- **Scope**: User bisa simpan produk ke favorit dari ProductCard (hover heart) atau BuyBox, lihat semua wishlist di `/wishlist` _(deliver: bukan `/akun/wishlist`)_, hapus item, lihat badge count di header.
- **Schema** (Prisma):
  ```
  model Wishlist {
    id        String   @id @default(cuid())
    userId    String
    productId String
    createdAt DateTime @default(now())
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
    @@unique([userId, productId])
    @@index([userId, createdAt])
  }
  ```
- **API**:
  - `POST /api/v1/users/me/wishlist/:productId` → `{ success: true }`
  - `DELETE /api/v1/users/me/wishlist/:productId` → `{ success: true }`
  - `GET /api/v1/users/me/wishlist?page=1&limit=20` → paginated list dengan Product+Shop nested
  - `GET /api/v1/users/me/wishlist/count` → `{ count }`
- **UI touch**:
  - [apps/web/src/components/product/ProductCard.tsx](apps/web/src/components/product/ProductCard.tsx) — tombol heart top-right, on-hover desktop, always visible mobile
  - [apps/web/src/components/product/BuyBox.tsx](apps/web/src/components/product/BuyBox.tsx#L164-L166) — tombol Wishlist jadi toggle aktif
  - Deliver: `apps/web/src/app/(buyer)/wishlist/page.tsx` — grid feed
  - Baru: `apps/web/src/store/wishlist.ts` — Zustand store mirror pattern cart
- **Acceptance**:
  - [x] Logged-out user klik heart → redirect ke `/masuk` dengan return URL
  - [x] Logged-in user klik heart → optimistic toggle, badge update tanpa reload
  - [x] Halaman `/wishlist` paginated 20/page, empty state ada CTA "Cari Produk"
  - [x] Hapus dari wishlist langsung remove dari grid tanpa reload
- **Effort**: S

---

### M7-A2. Recently Viewed ("Baru Dilihat") ⭐
- **Status**: 🟢 DONE
- **Owner**: Claude
- **Scope**: Track produk yang dilihat user (atau guest via cookie), tampilkan section "Baru Dilihat" di homepage + halaman `/baru-dilihat` _(deliver: bukan `/akun/baru-dilihat`)_.
- **Schema**:
  ```
  model ProductView {
    id         String   @id @default(cuid())
    userId     String?
    sessionKey String?
    productId  String
    viewedAt   DateTime @default(now())
    @@unique([userId, productId])
    @@unique([sessionKey, productId])
    @@index([userId, viewedAt])
    @@index([sessionKey, viewedAt])
  }
  ```
- **API**:
  - Modify `trackView` backend: selain increment counter, upsert ProductView (set viewedAt = now).
  - `GET /api/v1/users/me/recent-products?limit=10` → list 10 produk terbaru dilihat.
  - Guest: middleware set cookie `tk_session` (UUID, httpOnly, 30 hari) saat first request.
- **UI touch**:
  - [apps/web/src/app/(buyer)/page.tsx](apps/web/src/app/(buyer)/page.tsx) — tambah section di atas ProductFeed (hidden jika kosong)
  - Deliver: `apps/web/src/app/(buyer)/baru-dilihat/page.tsx` — list lengkap dengan hapus per-item
- **Acceptance**:
  - [x] Buka produk → muncul di "Baru Dilihat" homepage
  - [x] Maksimal 10 di homepage section, link "Lihat Semua"
  - [x] Guest tetap dapat track via cookie, hilang setelah cookie expire
  - [x] User bisa hapus per-item di halaman lengkap
- **Effort**: S–M

---

### M7-A9. Search Suggestions / Autocomplete
- **Status**: 🟢 DONE
- **Owner**: Claude
- **Scope**: Dropdown saat user ketik di search bar — section produk top match, kategori match, toko match, plus riwayat pencarian (login).
- **Schema**:
  ```
  model SearchHistory {
    id         String   @id @default(cuid())
    userId     String
    query      String
    searchedAt DateTime @default(now())
    @@index([userId, searchedAt])
  }
  ```
- **API**:
  - `GET /api/v1/search/suggest?q=` → `{ products: [...5], categories: [...3], shops: [...3] }`
  - Pakai Postgres ILIKE atau enable extension `pg_trgm` untuk fuzzy. Diskusi: butuh migration tambahan untuk enable extension.
- **UI touch**:
  - [apps/web/src/components/shell/Header.tsx](apps/web/src/components/shell/Header.tsx#L65-L68) — ganti `<form>` jadi client component `<SearchBar>` baru
  - Baru: `apps/web/src/components/shell/SearchBar.tsx` — input + dropdown absolute
- **Acceptance**:
  - [x] Debounce 250ms, fetch saat q.length >= 2
  - [x] Dropdown 3 section, max 11 items total
  - [x] Klik suggestion produk → `/produk/[slug]`; kategori → `/kategori/[slug]`; toko → `/toko/[slug]`
  - [x] Logged-in: 5 riwayat terakhir di atas, bisa hapus per-item
  - [x] ESC / blur → tutup dropdown
- **Effort**: S

---

### M7-D2. Personalized "Untuk Anda"
- **Status**: 🟢 DONE
- **Owner**: Claude
- **Scope**: Tab "Untuk Anda" di ProductFeed homepage sekarang = bestseller global. Ganti jadi personalized berdasarkan kategori yang sering dilihat user.
- **API**:
  - `GET /api/v1/products/for-you?limit=30` →
    - Logged-in: ambil top 3 kategori dari ProductView 30 hari terakhir + OrderItem, query bestseller di kategori-kategori itu, exclude yang sudah dibeli/dilihat 1 jam terakhir
    - Guest: fallback bestseller global (existing)
- **UI touch**:
  - [apps/web/src/app/(buyer)/page.tsx](apps/web/src/app/(buyer)/page.tsx#L15) — ganti fetch `forYou` dari `listProducts({sort:'bestseller'})` ke endpoint baru
- **Acceptance**:
  - [x] Logged-in user dengan history → produk yang muncul ada di kategori yang sering dilihat
  - [x] Guest → fallback bestseller global, tidak error
  - [x] Response time < 300ms p95 dengan 1k products
- **Effort**: S

---

### M8-A3. Diskusi Produk (Tanya Jawab Publik) ⭐
- **Status**: 🟢 DONE
- **Owner**: Claude
- **Deliver notes**: tab "Diskusi" jadi tab ke-4 di `InfoTabs` (bukan komponen terpisah `DiscussionThread.tsx` di bawah — komponennya ada, tapi dirender di dalam tab). Count ditampilkan di header thread ("Diskusi Produk (N)"), bukan badge di label tab. Notifikasi `NEW_QUESTION` juga dikirim ke penanya saat pertanyaannya dibalas.
- **Scope**: Tab "Diskusi" di halaman produk — pertanyaan publik dengan reply (1 level), penjual ditandai khusus, helpful count, sort newest/most-helpful.
- **Schema**:
  ```
  model Discussion {
    id              String   @id @default(cuid())
    productId       String
    userId          String
    parentId        String?
    message         String
    isSellerReply   Boolean  @default(false)
    helpfulCount    Int      @default(0)
    createdAt       DateTime @default(now())
    deletedAt       DateTime?
    parent          Discussion? @relation("DiscussionReplies", fields: [parentId], references: [id])
    replies         Discussion[] @relation("DiscussionReplies")
    @@index([productId, parentId, createdAt])
  }
  model DiscussionHelpful {
    discussionId String
    userId       String
    @@id([discussionId, userId])
  }
  ```
- **API**:
  - `GET /api/v1/products/:id/discussions?page=&sort=newest|helpful` → tree root + replies
  - `POST /api/v1/products/:id/discussions` (login)
  - `POST /api/v1/discussions/:id/reply` (login; `isSellerReply` auto-set kalau user = shop owner)
  - `POST /api/v1/discussions/:id/helpful` (toggle)
  - `DELETE /api/v1/discussions/:id` (own atau admin/seller of product)
- **UI touch**:
  - [apps/web/src/components/product/InfoTabs.tsx](apps/web/src/components/product/InfoTabs.tsx) — tambah tab ke-4 "Diskusi" dengan count badge
  - Baru: `apps/web/src/components/product/DiscussionThread.tsx`
- **Notif**: trigger `NotificationType.NEW_QUESTION` ke shop owner saat pertanyaan baru (root-level, bukan reply).
- **Acceptance**:
  - [x] Logged-out user lihat diskusi tapi tidak bisa tanya/reply
  - [x] Pertanyaan dari shop owner ditandai badge "Penjual"
  - [x] Helpful count bertambah tepat 1× per user
  - [x] Hapus = soft delete, comment muncul "[Pesan dihapus]"
- **Effort**: M

---

### M8-A6. Order Tracking Timeline + AWB — penyempurnaan
- **Status**: 🟢 DONE
- **Owner**: Claude
- **Deliver notes** (2026-07-07): kurir jadi dropdown 10 opsi di seller (daftar + pola URL lacak di `apps/web/src/lib/couriers.ts`), `courierName` wajib saat input resi (`shipOrderSchema`). Timeline buyer pakai `formatTanggalWaktu` baru (shared). GoSend/GrabExpress/Kurir Toko tidak punya link lacak (tanpa URL publik).
- **Sudah ada** (M3/M4): timeline visual status di buyer order detail, `Order.trackingNumber` + input resi di seller order detail, timestamp `paidAt/shippedAt/deliveredAt/completedAt/cancelledAt` di schema.
- **Scope (delta)**: tambah nama kurir + timestamp `processedAt`, tampilkan timestamp tanggal+jam per stage di timeline, tombol copy resi, link lacak kurir.
- **Schema diff**:
  ```
  // Order: tambah field (sisanya sudah ada)
  courierName  String?
  processedAt  DateTime?
  ```
- **API**: transisi PAID→PROCESSING set `processedAt`; input resi di seller menerima `courierName` sekaligus.
- **UI touch**:
  - [apps/web/src/app/(buyer)/pesanan/[id]/page.tsx](apps/web/src/app/(buyer)/pesanan/[id]/page.tsx) — timeline existing: tambah timestamp per stage, tombol copy resi, link kurir
  - [apps/web/src/app/seller/pesanan/[id]/page.tsx](apps/web/src/app/seller/pesanan/[id]/page.tsx) — form resi existing: tambah dropdown nama kurir
- **Acceptance**:
  - [x] Stage selesai tampilkan timestamp tanggal+jam
  - [x] Nomor resi tampil dengan tombol copy
  - [x] Link kurir berdasarkan `courierName` (mock URL pattern)
- **Effort**: S (turun dari M — fondasi sudah ada)

---

### M8-C2. Report / Pelaporan
- **Status**: 🟢 DONE
- **Owner**: Claude
- **Deliver notes** (2026-07-07): entry point bukan kebab menu di ProductCard, tapi tombol/ikon "🚩 Laporkan" di: halaman detail produk (baris rating), item ulasan (ikon), header halaman toko, dan item diskusi (ikon, hanya bukan milik sendiri) — komponen reusable `ReportButton`/`ReportModal`. ACTIONED otomatis: PRODUCT → takedown, REVIEW → `isHidden`, DISCUSSION → soft delete; SHOP/USER ditindak manual via panel existing. Guard anti-spam: 1 laporan OPEN per user per target. Enum `REVIEWING` ada di schema tapi belum dipakai UI.
- **Scope**: User bisa laporkan produk/ulasan/toko/diskusi via kebab menu, admin punya queue untuk arbitrase.
- **Schema**:
  ```
  enum ReportTargetType { PRODUCT REVIEW SHOP DISCUSSION USER }
  enum ReportStatus { OPEN REVIEWING ACTIONED DISMISSED }
  model Report {
    id           String   @id @default(cuid())
    reporterId   String
    targetType   ReportTargetType
    targetId     String
    reason       String
    description  String?
    evidenceUrls String[]
    status       ReportStatus @default(OPEN)
    adminNote    String?
    createdAt    DateTime @default(now())
    resolvedAt   DateTime?
    @@index([status, createdAt])
    @@index([targetType, targetId])
  }
  ```
- **API**:
  - `POST /api/v1/reports`
  - `GET /api/v1/admin/reports?status=&type=`
  - `POST /api/v1/admin/reports/:id/resolve` body `{ action: "ACTIONED"|"DISMISSED", note? }`
- **UI touch**:
  - ProductCard kebab menu → modal pelaporan
  - Review item & toko card sama
  - Baru: `apps/web/src/app/admin/laporan/page.tsx` — queue + detail
- **Acceptance**:
  - [x] Form lapor: 5 reason picker + description optional + upload max 3 file
  - [x] Admin queue filter by status/type
  - [x] Action "ACTIONED" untuk produk → otomatis takedown produk
  - [x] User yang laporkan dapat notif keputusan admin
- **Effort**: M

---

### M8-B6. Template Reply Chat
- **Status**: 🟢 DONE
- **Owner**: Claude
- **Deliver notes** (2026-07-07): reorder pakai tombol ▲▼ (swap `order`), bukan drag-and-drop. Composer chat seller dapat tombol 📋 → dropdown template (prop baru `templates` di `ChatRoom`, quick replies statis tetap ada). Manajemen template di section "Template Chat" halaman pengaturan seller (komponen `ChatTemplateManager`).
- **Scope**: Seller punya snippet template di chat composer, bisa insert sekali klik, manage list di settings.
- **Schema**:
  ```
  model ChatTemplate {
    id        String   @id @default(cuid())
    shopId    String
    label     String
    body      String
    order     Int      @default(0)
    createdAt DateTime @default(now())
    @@index([shopId, order])
  }
  ```
- **API**: `GET/POST/PUT/DELETE /api/v1/seller/chat-templates`
- **UI touch**:
  - Seller chat composer: tombol icon → dropdown list template
  - Baru: section "Template Chat" di [apps/web/src/app/seller/pengaturan/page.tsx](apps/web/src/app/seller/pengaturan/page.tsx)
- **Acceptance**:
  - [x] Max 20 template per toko
  - [x] Klik template → insert body ke composer (replace, bukan append)
  - [x] Drag-and-drop reorder (atau input order angka) — deliver: tombol ▲▼
- **Effort**: S

---

### M9-A4. Voucher Picker di Checkout
- **Status**: 🟢 DONE
- **Owner**: Claude
- **Deliver notes** (2026-07-07): endpoint pakai `GET /promo/available?subtotal=` (param `shopId` sudah disiapkan, efektif setelah M9-B2). Apply dari picker tetap divalidasi server-side via `POST /promo/validate` (sumber kebenaran satu). Tag jenis voucher = "Potongan Rp X" / "Diskon X%" (jenis Cashback belum ada di schema PromoCode). Input manual pindah ke bawah tombol "Pakai Voucher" + tersedia juga di dalam modal.
- **Scope**: Modal "Pakai Voucher" di checkout, list voucher tersedia dengan tag jenis (Cashback/Diskon/Gratis Ongkir), validasi otomatis.
- **API**:
  - `GET /api/v1/promo/available?subtotal=&shopId=` → `{ eligible: [...], ineligible: [{ promo, reason }] }`
- **UI touch**:
  - [apps/web/src/app/(buyer)/checkout/page.tsx](apps/web/src/app/(buyer)/checkout/page.tsx) — tombol "Pakai Voucher" → modal `<VoucherPicker>`
  - Baru: `apps/web/src/components/checkout/VoucherPicker.tsx`
- **Acceptance**:
  - [x] Voucher eligible di atas, ineligible di bawah dengan alasan
  - [x] Radio select → preview perubahan total
  - [x] Voucher dari toko hanya muncul untuk order toko tsb _(terpenuhi oleh M9-B2)_
  - [x] Input manual kode tetap tersedia sebagai fallback
- **Effort**: S

---

### M9-B2. Toko Voucher
- **Status**: 🟢 DONE · **Owner**: Claude
- **Deliver notes** (2026-07-08): jenis voucher = potongan Rp / diskon % (cashback & gratis ongkir tidak ada di schema `PromoCode` — konsisten M9-A4). **Kuota per user tidak diimplementasikan** — butuh model redemption per-user (belum ada di schema); kuota total (`usageLimit`) jalan. Voucher toko di picker hanya ditawarkan saat checkout berisi 1 toko; input manual tetap divalidasi server-side (`/promo/validate` + checkout service menolak kalau toko tidak cocok). Diskon voucher toko dipotong penuh ke order toko tsb (bukan proporsional lintas toko), basis min. belanja = subtotal toko itu saja.
- **Scope**: Seller bikin voucher khusus tokonya (diskon%/Rp / cashback / gratis ongkir), set kuota & periode & min belanja.
- **Schema diff**: tambah `PromoCode.shopId String?` + index `(shopId, isActive)`.
- **API**: `GET/POST/PUT/DELETE /api/v1/seller/voucher`
- **UI touch**: Baru `apps/web/src/app/seller/promo/page.tsx` (list + form modal)
- **Acceptance**:
  - [x] Form: kode, diskon (% atau Rp), min belanja, kuota total, mulai-berakhir _(kuota per user: deferred — butuh model redemption)_
  - [x] Voucher hanya muncul di Voucher Picker (M9-A4) untuk order toko ini
  - [x] Seller bisa pause/resume voucher
- **Effort**: S

---

### M9-B3. Sale Price (Diskon Produk Periodik)
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Produk punya harga coret + sale price dengan periode. Card render badge "-XX%", detail render countdown jika sale berakhir < 24 jam.
- **Schema diff**: `Product.salePrice Int?` `Product.saleStartAt DateTime?` `Product.saleEndAt DateTime?`
- **API**: helper `getEffectivePrice(product, now)` di shared package, sertakan `originalPrice` + `discountPct` di response.
- **UI touch**:
  - [apps/web/src/components/product/ProductCard.tsx](apps/web/src/components/product/ProductCard.tsx) — harga coret + sale price + badge persen
  - [apps/web/src/components/product/BuyBox.tsx](apps/web/src/components/product/BuyBox.tsx) — subtotal pakai effective price + countdown component
  - Seller product form: section "Diskon Periodik"
- **Acceptance**:
  - [ ] Badge "-25%" muncul saat `salePrice` aktif & dalam periode
  - [ ] Setelah `saleEndAt` lewat, fallback ke `price` original tanpa intervensi
  - [ ] Countdown muncul kalau sisa < 24 jam
  - [ ] Order yang dibuat selama sale menyimpan harga effective di `OrderItem.priceAtPurchase`
- **Effort**: M

---

### M9-C1. Voucher Platform Global
- **Status**: 🟢 DONE · **Owner**: Claude
- **Deliver notes** (2026-07-08): reuse `voucherCreateSchema`/`voucherUpdateSchema` dari M9-B2. Halaman admin punya 3 tab scope: Platform (CRUD penuh) / Voucher Toko (read-only, monitoring) / Semua. Route admin hanya bisa edit/hapus voucher platform (`shopId: null`) — voucher toko milik seller. **Target scope kategori (`categoryId`) deferred**: butuh kolom + enforcement per-item di checkout & validate; belum sepadan (opsional di rencana).
- **Scope**: Admin terbit voucher platform-wide (tanpa `shopId` = berlaku semua toko).
- **API**: `GET/POST/PUT/DELETE /api/v1/admin/voucher` (extend admin layer)
- **UI**: Baru `apps/web/src/app/admin/voucher/page.tsx`
- **Acceptance**:
  - [x] Voucher tanpa shopId muncul di Voucher Picker untuk semua user
  - [ ] Bisa target scope kategori (opsional `categoryId`) — _deferred, lihat deliver notes_
- **Effort**: S

---

### M10-A5. QRIS Mock — UX lengkap (QR render + countdown + expiry)
- **Status**: 🔵 TODO (scope dipersempit 2026-07-03 — metode bayar sudah ada)
- **Owner**: _belum di-klaim_
- **Sudah ada** (M3): `QRIS_MOCK` di enum `PaymentMethod`, radio metode bayar di checkout (COD/Transfer/QRIS), `POST /api/v1/orders/:id/pay` yang langsung auto-paid.
- **Scope (delta)**: ganti auto-paid jadi flow realistis — halaman bayar render QR code + countdown 15 menit, tombol "Saya sudah bayar (mock)" terpisah untuk simulate webhook, order expired otomatis kalau lewat batas waktu.
- **Schema**: tidak ada migration — enum sudah punya `QRIS_MOCK`.
- **Library**: `qrcode` (npm) untuk render data URI server-side atau `react-qr-code` client-side.
- **API**:
  - `GET /api/v1/orders/:id/qris` → `{ qrString, amount, expiresAt }`
  - `POST /api/v1/orders/:id/qris/simulate-paid` → set status PAID + paidAt (dev/mock only — production akan diganti webhook PSP); gantikan auto-paid di `POST /orders/:id/pay`
- **UI touch**:
  - [apps/web/src/app/(buyer)/pesanan/[id]/bayar/page.tsx](apps/web/src/app/(buyer)/pesanan/[id]/bayar/page.tsx) — branching by paymentMethod: QRIS render QR + countdown
- **Acceptance**:
  - [ ] User pilih QRIS di checkout → halaman bayar render QR + countdown 15 menit
  - [ ] Tombol simulate-paid → status order PAID, redirect ke detail
  - [ ] Setelah 15 menit, status order EXPIRED (cron atau lazy-check)
  - [ ] Bank transfer & COD flow lama tetap jalan tanpa regresi
- **Effort**: S

---

### M10-A7. Komplain / Return Beyond Refund
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Setelah barang diterima (DELIVERED), buyer punya 2 hari ajukan komplain dengan bukti foto/video, opsi return-refund atau return-replacement. Flow buyer → seller respon → escalate ke admin.
- **Schema**:
  ```
  enum ComplaintType { BROKEN NOT_AS_DESCRIBED MISSING_ITEM OTHER }
  enum ComplaintResolution { REFUND REPLACEMENT }
  enum ComplaintStatus { OPEN SELLER_RESPONDED ESCALATED RESOLVED REJECTED }
  model Complaint {
    id              String   @id @default(cuid())
    orderId         String
    orderItemId     String
    buyerId         String
    type            ComplaintType
    description     String
    evidenceUrls    String[]
    resolutionType  ComplaintResolution
    status          ComplaintStatus @default(OPEN)
    sellerResponse  String?
    adminDecision   String?
    createdAt       DateTime @default(now())
    resolvedAt      DateTime?
    @@index([buyerId, status])
    @@index([status, createdAt])
  }
  ```
- **Window**: `Order.deliveredAt + 2 days` adalah deadline ajukan.
- **API**:
  - `POST /api/v1/orders/:id/complaints`
  - `POST /api/v1/complaints/:id/seller-respond` body `{ accept: boolean, message }`
  - `POST /api/v1/complaints/:id/escalate` (buyer setelah seller reject)
  - `POST /api/v1/admin/complaints/:id/decide` body `{ outcome: "RESOLVED"|"REJECTED", note }`
  - `GET /api/v1/me/complaints`, `/api/v1/seller/complaints`, `/api/v1/admin/complaints`
- **UI**:
  - Tombol "Komplain" di buyer order detail (hanya muncul jika DELIVERED + dalam window)
  - Halaman buyer/seller/admin queue + detail
- **Acceptance**:
  - [ ] Tombol "Komplain" hilang setelah window 2 hari lewat
  - [ ] Seller bisa accept (langsung set RESOLVED + trigger refund/replacement flow) atau reject
  - [ ] Setelah reject, buyer punya tombol "Naikkan ke Admin"
  - [ ] Admin keputusan final, tidak bisa di-escalate lagi
- **Effort**: L

---

### M10-A10. Filter Search Lengkap
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Lengkapi sidebar filter di `/cari` dengan harga range, kondisi, rating min, lokasi, Official Store, bebas ongkir.
- **Audit dulu**: [apps/web/src/app/(buyer)/cari/page.tsx](apps/web/src/app/(buyer)/cari/page.tsx) — list filter existing vs gap.
- **Schema diff**: tambah `Product.codAvailable Boolean @default(false)`, `Product.freeShippingEligible Boolean @default(false)` (atau derive dari relasi promo).
- **API**: extend `listProducts` query params: `priceMin`, `priceMax`, `ratingMin`, `cities[]` (comma-separated), `condition`, `officialStoreOnly`, `freeShipping`, `cod`.
- **UI**: sidebar collapsible groups, count match per filter, "Reset Filter" button.
- **Acceptance**:
  - [ ] Filter rating min 4★ → produk dengan ratingAvg ≥ 4
  - [ ] Multi-city filter dengan OR semantics
  - [ ] URL sync (shareable filter state)
- **Effort**: M

---

### M11-B1. Etalase / Showcase Toko ⭐
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Seller kelompokkan produk dalam folder ("Best Seller", "Diskon"), tampil sebagai tab di halaman toko.
- **Schema**:
  ```
  model ShopShowcase {
    id        String   @id @default(cuid())
    shopId    String
    name      String
    slug      String
    order     Int      @default(0)
    products  ShopShowcaseProduct[]
    @@unique([shopId, slug])
    @@index([shopId, order])
  }
  model ShopShowcaseProduct {
    showcaseId String
    productId  String
    order      Int @default(0)
    @@id([showcaseId, productId])
  }
  ```
- **API**:
  - Seller: `GET/POST/PUT/DELETE /api/v1/seller/showcase`, `POST /api/v1/seller/showcase/:id/products` (bulk assign), `DELETE /api/v1/seller/showcase/:id/products/:productId`
  - Public: include di `GET /api/v1/shops/:slug` response
- **UI**:
  - Seller panel baru `apps/web/src/app/seller/etalase/page.tsx` — list + create modal + product picker (multi-select dari produk toko)
  - [apps/web/src/app/(buyer)/toko/[slug]/page.tsx](apps/web/src/app/(buyer)/toko/[slug]/page.tsx) — tab bar atas (etalase + tab "Semua")
  - Route: `apps/web/src/app/(buyer)/toko/[slug]/etalase/[showcaseSlug]/page.tsx`
- **Acceptance**:
  - [ ] Produk bisa ada di > 1 etalase
  - [ ] Etalase tanpa produk tidak ditampilkan ke buyer
  - [ ] Drag reorder etalase
- **Effort**: M

---

### M11-B4. Statistik Produk Detail
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Seller lihat per-produk: view 7/30d, ATC count, conversion %, revenue, line chart.
- **API**: `GET /api/v1/seller/products/:id/stats?range=7d|30d|all` aggregate dari ProductView (M7-A2), CartItem, OrderItem.
- **UI**: Baru `apps/web/src/app/seller/produk/[id]/statistik/page.tsx` — pakai chart library ringan (recharts atau chart.js).
- **Acceptance**:
  - [ ] Chart view 30 hari render < 500ms
  - [ ] Conversion = `paidOrderCount / viewCount` (dengan handling division by zero)
  - [ ] Tabel detail order yang include produk ini
- **Effort**: S

---

### M11-A8. Variant Kombinasi Multi-Axis
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Refactor variant dari single-axis (`name`) jadi multi-axis (warna × ukuran × ...). Stock & price per kombinasi.
- **Schema**:
  ```
  model ProductOption {
    id        String   @id @default(cuid())
    productId String
    name      String   // "Warna", "Ukuran"
    order     Int      @default(0)
    values    ProductOptionValue[]
  }
  model ProductOptionValue {
    id        String   @id @default(cuid())
    optionId  String
    value     String   // "Merah", "M"
    order     Int      @default(0)
  }
  // ProductVariant: drop `name`, tambah relasi M2M ke values
  model ProductVariant {
    id            String   @id @default(cuid())
    productId     String
    sku           String?
    stock         Int
    priceModifier Int      @default(0)
    imageUrl      String?
    values        ProductVariantValue[]
  }
  model ProductVariantValue {
    variantId     String
    optionValueId String
    @@id([variantId, optionValueId])
  }
  ```
- **Data migration**: existing single-axis variants → buat 1 ProductOption "Varian" + values per row.
- **API**: include nested struktur di product detail; semua input form pakai struktur baru.
- **UI**:
  - BuyBox: render satu kelompok chip per option, disable value tidak valid (tidak combine ke variant aktif), update image jika variant punya imageUrl khusus.
  - Seller form: matrix editor — table 2D dengan cell per kombinasi, input stock+priceMod+sku.
- **Migration plan**:
  1. Tambah tabel baru (additive)
  2. Backfill script jalankan untuk convert data
  3. Switch code path baca ke struktur baru
  4. Drop kolom legacy
- **Acceptance**:
  - [ ] Produk lama tetap render benar setelah migration
  - [ ] Pilih warna "Merah" → ukuran yang tidak ada stok Merah disable
  - [ ] Total kombinasi max 50 (UI guard)
- **Effort**: L (paling besar di milestone)

---

### M12-A11. Mobile Bottom Nav
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Bottom nav fixed 5 icon untuk mobile (Home / Wishlist / Order / Notif / Akun).
- **UI**:
  - Baru: `apps/web/src/components/shell/MobileBottomNav.tsx` — `fixed bottom-0 md:hidden`
  - [apps/web/src/app/(buyer)/layout.tsx](apps/web/src/app/(buyer)/layout.tsx) — render + tambah `pb-[64px]` ke `<main>`
- **Acceptance**:
  - [ ] Active state berdasarkan pathname (home / akun/wishlist / pesanan / notifikasi / akun)
  - [ ] Badge count untuk Notif & Order (pending payment)
  - [ ] Tidak muncul di halaman checkout/bayar (hide UI ribet)
- **Effort**: S

---

### M12-D3. SEO & Meta
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Sitemap dinamis, robots, JSON-LD per produk, OG meta per produk/toko/kategori.
- **Files**:
  - Baru: `apps/web/src/app/sitemap.ts` (Next 14 metadata route)
  - Baru: `apps/web/src/app/robots.ts`
  - [apps/web/src/app/(buyer)/produk/[slug]/page.tsx](apps/web/src/app/(buyer)/produk/[slug]/page.tsx) — `generateMetadata()` + `<script type="application/ld+json">`
  - Sama untuk `/toko/[slug]` & `/kategori/[slug]`
- **Acceptance**:
  - [ ] `/sitemap.xml` list semua produk/toko/kategori dengan lastmod
  - [ ] Google Rich Results Test pass untuk product page
  - [ ] OG image kelihatan saat preview link di WhatsApp/Telegram
- **Effort**: S

---

### M12-D4. Image Optimization Audit
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Audit `<img>` yang belum pakai `next/image`, register remote pattern.
- **Files**:
  - [apps/web/src/components/product/ProductReviews.tsx](apps/web/src/components/product/ProductReviews.tsx#L192) — convert ke Image dengan `unoptimized` jika perlu
  - [apps/web/next.config.js](apps/web/next.config.js) — tambah `images.remotePatterns` untuk MinIO/R2
- **Acceptance**:
  - [ ] Lighthouse "Properly size images" pass
  - [ ] Tidak ada warning eslint-disable img element baru
- **Effort**: S

---

### M12-C3. Audit Log Aksi Admin
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Catat semua aksi admin (siapa takedown apa, kapan, alasan).
- **Schema**:
  ```
  model AdminLog {
    id         String   @id @default(cuid())
    adminId    String
    action     String   // "TAKEDOWN_PRODUCT", "VERIFY_KTP", ...
    targetType String?
    targetId   String?
    payload    Json?
    note       String?
    createdAt  DateTime @default(now())
    @@index([adminId, createdAt])
    @@index([action, createdAt])
  }
  ```
- **Implementation**: middleware atau decorator di route `/admin/*` log setiap action sukses.
- **UI**: Baru `apps/web/src/app/admin/log/page.tsx` — filter by adminId, action, date range, pagination.
- **Acceptance**:
  - [ ] Setiap aksi admin tercatat dalam ≤ 100ms tanpa block response
  - [ ] Log viewer filter & paginated
  - [ ] Log tidak bisa dihapus (append-only)
- **Effort**: S

---

## B. Hasil audit vs Tokopedia — M13–M15 (ditambahkan 2026-07-03)

> Gap terhadap fitur Tokopedia yang **belum ada di kode dan belum tercakup M7–M12**. Fitur yang sudah ternyata ada (mode libur toko, share produk, COD, QRIS mock) tidak dibuatkan item. Fitur out-of-scope (payment gateway real, live shopping, TopAds, koin/loyalty, afiliasi) tetap di luar lingkup sesuai scope guard.

### M13-A1. Follow / Favorit Toko ⭐
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Buyer bisa follow toko dari halaman toko, lihat daftar toko yang di-follow di `/akun/toko-favorit`, unfollow. Halaman toko tampilkan jumlah follower. Pilar retensi utama Tokopedia yang belum ada sama sekali.
- **Schema**:
  ```
  model ShopFollower {
    shopId    String
    userId    String
    createdAt DateTime @default(now())
    shop      Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)
    user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@id([shopId, userId])
    @@index([userId, createdAt])
  }
  ```
- **API**:
  - `POST /api/v1/shops/:slug/follow` · `DELETE /api/v1/shops/:slug/follow`
  - `GET /api/v1/users/me/following?page=&limit=` → list toko + followerCount
  - `GET /api/v1/shops/:slug` — include `followerCount` + `isFollowing` (jika login)
- **UI touch**:
  - [apps/web/src/app/(buyer)/toko/[slug]/page.tsx](apps/web/src/app/(buyer)/toko/[slug]/page.tsx) — tombol Follow/Following + follower count di header toko
  - Baru: `apps/web/src/app/(buyer)/akun/toko-favorit/page.tsx` — grid toko
- **Acceptance**:
  - [ ] Logged-out klik Follow → redirect `/masuk` dengan return URL (pola sama M7-A1)
  - [ ] Toggle optimistic, follower count update tanpa reload
  - [ ] Unfollow dari halaman `/akun/toko-favorit` langsung remove dari grid
- **Effort**: S

---

### M13-A2. Invoice Pesanan (Buyer)
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Buyer bisa lihat & cetak invoice per pesanan — halaman printable ala `seller/pesanan/[id]/print` yang sudah ada (bukan PDF generator, cukup print-to-PDF browser).
- **Schema**: tidak ada — semua data sudah di `Order` (orderNumber, snapshot alamat, items, total).
- **API**: pakai `GET /api/v1/orders/:id` existing (guard: hanya buyer pemilik order).
- **UI touch**:
  - Baru: `apps/web/src/app/(buyer)/pesanan/[id]/invoice/page.tsx` — layout print-friendly (logo, nomor invoice = orderNumber, rincian item, ongkir, diskon, total, metode bayar)
  - [apps/web/src/app/(buyer)/pesanan/[id]/page.tsx](apps/web/src/app/(buyer)/pesanan/[id]/page.tsx) — tombol "Lihat Invoice" (muncul setelah PAID)
- **Acceptance**:
  - [ ] Invoice hanya bisa diakses buyer pemilik order
  - [ ] Tombol muncul hanya untuk status ≥ PAID
  - [ ] `window.print()` menghasilkan 1 halaman A4 rapi (media query print)
- **Effort**: S

---

### M13-B1. Harga Grosir (Tiered Pricing)
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Seller set harga bertingkat per kuantitas (beli ≥10 lebih murah). Fitur khas Tokopedia yang pas untuk UMKM semi-B2B. BuyBox render tabel harga grosir, harga di cart/checkout mengikuti qty.
- **Schema**:
  ```
  model ProductWholesaleTier {
    id        String  @id @default(cuid())
    productId String
    minQty    Int
    price     Int
    product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
    @@unique([productId, minQty])
  }
  ```
- **API**:
  - Include `wholesaleTiers` di product detail & seller product form (nested create/update)
  - Helper `getUnitPrice(product, qty)` di shared package — dipakai cart, checkout, dan `OrderItem.priceAtPurchase`
- **UI touch**:
  - [apps/web/src/components/product/BuyBox.tsx](apps/web/src/components/product/BuyBox.tsx) — tabel harga grosir + harga berubah saat qty naik
  - Seller product form ([apps/web/src/app/seller/produk/baru](apps/web/src/app/seller/produk/baru/page.tsx) & edit) — section "Harga Grosir" (max 5 tier)
- **Acceptance**:
  - [ ] Validasi: minQty naik monoton, price turun monoton, max 5 tier
  - [ ] Ubah qty di BuyBox/cart → harga satuan & subtotal update sesuai tier
  - [ ] `OrderItem.priceAtPurchase` menyimpan harga tier saat checkout
  - [ ] Interaksi dengan sale price (M9-B3): pakai `min(effectivePrice, tierPrice)` — dokumentasikan di helper
- **Effort**: M

---

### M13-B2. Broadcast Promo ke Follower
- **Status**: ⚪ BLOCKED (butuh M13-A1) · **Owner**: _belum di-klaim_
- **Scope**: Seller kirim pengumuman/promo ke semua follower tokonya via notifikasi in-app (bukan chat massal). Rate-limited supaya tidak jadi spam.
- **Schema**:
  ```
  model ShopBroadcast {
    id        String   @id @default(cuid())
    shopId    String
    title     String
    body      String
    productId String?  // opsional: link ke produk
    sentAt    DateTime @default(now())
    @@index([shopId, sentAt])
  }
  ```
- **API**:
  - `POST /api/v1/seller/broadcast` — buat broadcast + fan-out `Notification` ke follower (batch insert; tipe baru `SHOP_BROADCAST`)
  - `GET /api/v1/seller/broadcast` — riwayat
- **UI touch**: Baru section "Broadcast" di [apps/web/src/app/seller/pengaturan/page.tsx](apps/web/src/app/seller/pengaturan/page.tsx) atau halaman sendiri `apps/web/src/app/seller/broadcast/page.tsx`
- **Acceptance**:
  - [ ] Rate limit: max 1 broadcast per toko per 24 jam
  - [ ] Follower dapat notif in-app, klik → halaman toko atau produk terkait
  - [ ] Fan-out 1000 follower tidak block response (> batch/async)
- **Effort**: M

---

### M14-A1. Login dengan Google (OAuth)
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Tombol "Masuk dengan Google" di `/masuk` & `/daftar`. Akun Google baru → auto-register; email sama dengan akun existing → link.
- **Schema diff**: `User.googleId String? @unique`, `User.passwordHash` jadi nullable (akun OAuth-only).
- **Library**: `google-auth-library` (verifikasi ID token) — flow: Google Identity Services di client → kirim credential ke API → verify → issue JWT pair existing.
- **API**: `POST /api/v1/auth/google` body `{ credential }` → response sama dengan login biasa (access+refresh token).
- **UI touch**: [apps/web/src/app/(auth)/masuk/page.tsx](apps/web/src/app/(auth)/masuk/page.tsx) & daftar — tombol Google di atas form.
- **ENV**: `GOOGLE_CLIENT_ID` (API + web `NEXT_PUBLIC_`).
- **Acceptance**:
  - [ ] Login Google akun baru → user terbuat, langsung masuk
  - [ ] Email Google = email akun password existing → login ke akun itu (set `googleId`)
  - [ ] Akun OAuth-only tidak bisa login via form password (error jelas)
- **Effort**: M

---

### M14-A2. Email Transaksional Real
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Ganti OTP mock dengan email sungguhan + email event penting: OTP register, reset password, order dibuat (buyer), order dibayar (seller), order dikirim (buyer).
- **Library**: `nodemailer` via SMTP (Resend/Brevo free tier untuk prod; MailHog di docker-compose untuk dev).
- **Schema**: tidak wajib (opsional `EmailLog` untuk debug).
- **Implementation**: service `email.service.ts` dengan template sederhana (HTML inline), dipanggil dari event yang sudah ada (auth OTP, order status transition — titik yang sama dengan trigger `Notification`).
- **ENV**: `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM`.
- **Acceptance**:
  - [ ] Dev: email tertangkap di MailHog (service baru di docker-compose)
  - [ ] Kirim email tidak block response (fire-and-forget + error di-log)
  - [ ] OTP register & reset password terkirim real, flow mock lama dihapus
- **Effort**: M

---

### M14-B1. Badge Reputasi Toko
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Versi ringan Power Merchant / Official Store Tokopedia. Badge otomatis dari performa + flag Official Store yang di-set admin. Tampil di ProductCard, halaman produk, dan halaman toko. Sinergi dengan filter `officialStoreOnly` di M10-A10.
- **Schema diff**: `Shop.isOfficialStore Boolean @default(false)` (di-set admin). Badge performa **derived, bukan kolom** — helper di shared package.
- **Logic**: `getShopBadge(shop)` → `OFFICIAL` (isOfficialStore) > `STAR_PLUS` (ktpVerified + ratingAvg ≥ 4.5 + totalSold ≥ 100) > `STAR` (ktpVerified + ratingAvg ≥ 4 + totalSold ≥ 10) > `NONE`.
- **API**: include `badge` di response product list/detail & shop detail; admin toggle `isOfficialStore` di `PUT /api/v1/admin/shops/:id`.
- **UI touch**:
  - [apps/web/src/components/product/ProductCard.tsx](apps/web/src/components/product/ProductCard.tsx) — icon badge kecil di samping nama toko
  - [apps/web/src/app/(buyer)/toko/[slug]/page.tsx](apps/web/src/app/(buyer)/toko/[slug]/page.tsx) — badge besar di header
  - Admin toko: toggle Official Store
- **Acceptance**:
  - [ ] Badge berubah otomatis saat kriteria terpenuhi (tanpa cron — dihitung saat read)
  - [ ] Admin set Official Store → badge OFFICIAL menang atas badge performa
  - [ ] Tooltip badge menjelaskan artinya
- **Effort**: M

---

### M14-B2. Bulk Edit Stok & Harga
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Mode edit inline di tabel produk seller — ubah harga/stok/status aktif banyak produk sekaligus, simpan sekali klik. (Bulk import CSV tetap out-of-scope; ini edit inline saja.)
- **Schema**: tidak ada.
- **API**: `PATCH /api/v1/seller/products/bulk` body `[{ id, price?, stock?, isActive? }]` — validasi kepemilikan semua id, transaksi tunggal.
- **UI touch**: [apps/web/src/app/seller/produk/page.tsx](apps/web/src/app/seller/produk/page.tsx) — tombol "Edit Massal" → cell harga/stok jadi input, checkbox aktif, tombol Simpan/Batal sticky.
- **Acceptance**:
  - [ ] Edit 20 produk → 1 request, 1 transaksi DB
  - [ ] Produk milik toko lain di payload → 403, tidak ada yang tersimpan
  - [ ] Validasi client: harga ≥ 100, stok ≥ 0
- **Effort**: S

---

### M15-C1. Flash Sale (Event Terjadwal)
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Admin buat event flash sale (nama, periode, slot produk dengan harga khusus + kuota). Homepage render section countdown + produk flash sale; halaman `/flash-sale`. Beda dari M9-B3 (sale price per produk oleh seller): ini event terpusat dengan kuota, dikurasi admin.
- **Schema**:
  ```
  model FlashSale {
    id       String   @id @default(cuid())
    name     String
    startAt  DateTime
    endAt    DateTime
    isActive Boolean  @default(true)
    items    FlashSaleItem[]
    @@index([startAt, endAt])
  }
  model FlashSaleItem {
    id          String @id @default(cuid())
    flashSaleId String
    productId   String
    salePrice   Int
    quota       Int
    soldCount   Int    @default(0)
    flashSale   FlashSale @relation(fields: [flashSaleId], references: [id], onDelete: Cascade)
    @@unique([flashSaleId, productId])
  }
  ```
- **API**:
  - Admin CRUD: `GET/POST/PUT/DELETE /api/v1/admin/flash-sales` + kelola items
  - Public: `GET /api/v1/flash-sales/active` → event berjalan + items (product nested, sisa kuota)
  - Checkout: kalau produk ada di flash sale aktif & kuota sisa → pakai `salePrice`, increment `soldCount` dalam transaksi (guard race: `UPDATE ... WHERE soldCount < quota`)
- **UI touch**:
  - Homepage — section "⚡ Flash Sale" dengan countdown + progress bar kuota per produk
  - Baru: `apps/web/src/app/(buyer)/flash-sale/page.tsx`
  - Baru: `apps/web/src/app/admin/flash-sale/page.tsx`
- **Acceptance**:
  - [ ] Kuota habis → produk tampil "Habis" di section, checkout pakai harga normal
  - [ ] Dua buyer rebutan kuota terakhir → hanya 1 dapat harga flash (uji race)
  - [ ] Event lewat `endAt` → section hilang dari homepage tanpa intervensi
  - [ ] Prioritas harga: flash sale > sale price (M9-B3) > harga grosir (M13-B1) — dokumentasikan di helper harga shared
- **Effort**: L

---

### M15-B1. Pre-Order
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Produk made-by-order (makanan, kerajinan) bisa ditandai pre-order dengan lead time X hari. Badge di card & BuyBox, SLA proses order menyesuaikan.
- **Schema diff**: `Product.isPreorder Boolean @default(false)`, `Product.preorderDays Int?` (1–90).
- **API**: include di product response; validasi `preorderDays` wajib jika `isPreorder`.
- **UI touch**:
  - [apps/web/src/components/product/ProductCard.tsx](apps/web/src/components/product/ProductCard.tsx) & [BuyBox.tsx](apps/web/src/components/product/BuyBox.tsx) — badge "Pre-Order · X hari"
  - Seller product form — toggle + input hari
  - Order detail — info estimasi proses untuk item pre-order
- **Acceptance**:
  - [ ] Badge tampil konsisten di card, detail, cart, checkout
  - [ ] Checkout campur produk ready + pre-order → estimasi pakai lead time terlama
  - [ ] Toggle off → `preorderDays` di-clear
- **Effort**: S–M

---

### M15-D1. PWA (Manifest + Installable)
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Web app installable di Android/desktop — manifest, ikon, theme color. Pelengkap Mobile Bottom Nav (M12-A11). Service worker/offline **tidak** termasuk (cukup installable).
- **Files**:
  - Baru: `apps/web/src/app/manifest.ts` (Next 14 metadata route) — name, icons 192/512, `display: standalone`, theme color brand
  - Ikon dari favicon brand existing (commit `3dfd290`) di-export ke ukuran PWA
- **Acceptance**:
  - [ ] Chrome Android tampilkan prompt "Add to Home Screen"
  - [ ] Lighthouse PWA installable check pass
  - [ ] Ikon & splash tampil benar saat launch dari home screen
- **Effort**: S

---

## 🛠️ OPS — DevOps & Reliability

> Bukan fitur produk, tapi fondasi CI/CD & keandalan produksi. Deploy live: **https://toko.emha.space** (Docker Compose + Caddy + HTTPS).

| ID | Item | Status | Catatan |
|---|---|---|---|
| `OPS-1` | **CI gate di PR** (lint + test + build ala-produksi) | 🟢 DONE | `.github/workflows/ci.yml` |
| `OPS-2` | **Auto-migrate saat deploy** (`prisma migrate deploy` sebelum app naik) | 🟢 DONE | di `deploy.yml` |
| `OPS-3` | **Smoke-test pasca-deploy** (`/api/health` + homepage via Caddy) | 🟢 DONE | gagal → deploy ditandai merah |
| `OPS-4` | **Backup DB harian** (`pg_dump` + rotasi) | 🟢 DONE | `scripts/backup-db.sh` + cron VPS |
| `OPS-5` | **Branch protection `main`** (wajib CI lulus + ≥1 review) | 🔵 TODO | butuh admin repo; jadikan `CI / verify` required check |
| `OPS-6` | **Build di CI + image registry** (GHCR), berhenti build di VPS prod | 🔵 TODO | hemat resource box 2-vCPU, image ter-tag |
| `OPS-7` | **Rollback strategy** (deploy image ber-tag, bisa balik versi) | 🔵 TODO | tergantung OPS-6 |
| `OPS-8` | **Staging environment** sebelum prod | 🔵 TODO | bisa compose terpisah / VPS kedua |
| `OPS-9` | **Bereskan type API → kembalikan `tsc` gate** (lepas `tsx` runtime & `ignoreBuildErrors`) | 🔵 TODO | utang teknis dari deploy awal |
| `OPS-10` | **Monitoring & error tracking** (uptime check, log terpusat, Sentry) | 🔵 TODO | tahu insiden dari sistem, bukan user |
| `OPS-11` | **Secret management / backup** (`.env.production` saat ini hanya di VPS) | 🔵 TODO | risiko hilang kalau VPS rusak |
| `OPS-12` | **Host hardening** (ufw, non-root deploy user, fail2ban) | 🔵 TODO | saat ini SSH root, ufw inactive |

---

## ⛔ Dropped / out-of-scope (referensi)

| ID | Fitur | Alasan |
|---|---|---|
| `A5-legacy` | Multi payment (VA, e-wallet, kartu, paylater) | Lingkup MVP hanya COD + TRANSFER_MANUAL + QRIS_MOCK |
| `AUDIT-koin` | Koin / cashback loyalty & program afiliasi (ala Tokopedia) | Butuh ekosistem payment real dulu |
| `AUDIT-kurir` | Integrasi kurir real-time (cek ongkir JNE/SiCepat API) | Ongkir per zona adalah keputusan sadar MVP |
| `A12` | Web Push Notifications | In-app notif sudah cukup |
| `B5` | Bulk import CSV produk | Overhead vs nilai MVP |
| `D1` | TopUp & Tagihan real (provider integration) | Optional — UI di HeroCard tetap mock atau "Coming Soon" |

---

## 🗓️ Sequencing milestone

| Milestone | Fokus | Isi | Estimasi |
|---|---|---|---|
| 🟢 **M7 — Wishlist & Discovery** | Engagement | A1 · A2 · A9 · D2 | **DONE** (PR #16) |
| 🟢 **M8 — Trust & Communication** | Transparansi | A3 · A6 · C2 · B6 | **DONE** (PR #18, #21, #22, B6) |
| **M9 — Voucher & Promo Lengkap** | Konversi | A4 · B2 · B3 · C1 | ~2–3 hari |
| **M10 — Komplain & QRIS** | Operasional | A7 · **A5 (QRIS)** · A10 | ~3 hari |
| **M11 — Seller Tools & Variant** | Power-seller | B1 · B4 · A8 | ~4 hari |
| **M12 — Mobile, SEO, Audit** | Polish | A11 · D3 · D4 · C3 | ~2 hari |
| **M13 — Loyalitas & Toko** | Retensi | A1 · A2 · B1 · B2 | ~3 hari |
| **M14 — Akun & Kepercayaan** | Trust & onboarding | A1 · A2 · B1 · B2 | ~3–4 hari |
| **M15 — Event & Polish Mobile** | Konversi & event | C1 · B1 · D1 | ~4 hari |

Estimasi asumsi **1 orang full-time per milestone**. Bisa diparalelkan antar-orang dalam satu milestone selama tidak sentuh file yang sama.

---

## 🔀 Cara kolaborasi

### Naming
- **Branch**: `feat/M{N}-{ID}-{kebab-summary}` — contoh `feat/M7-A1-wishlist`
- **Commit**: prefiks `feat(M7-A1):`, `fix(M8-A6):`, `docs(roadmap):` dst.
- **PR title**: `M7-A1 Wishlist / Favorit`

### Workflow per fitur
1. Cek `Status` di dokumen ini — kalau 🔵 TODO, klaim dengan PR kecil yang ubah status jadi 🟡 IN PROGRESS + isi Owner.
2. Bikin branch dari `main` (atau base milestone jika ada milestone branch).
3. Kerjakan sesuai Scope/Schema/API/UI/Acceptance.
4. PR include checklist Acceptance — review approve baru merge.
5. Setelah merge, update Status jadi 🟢 DONE + entry di [CHANGELOG.md](CHANGELOG.md).

### Cross-milestone dependencies
- **M7-A1 Wishlist** → dipakai di M12-A11 Mobile Bottom Nav (icon wishlist) — selesaikan A1 dulu.
- **M7-A2 ProductView** → dipakai di M11-B4 Statistik Produk & M7-D2 For-You — schema A2 harus ada lebih dulu.
- **M9-A4 Voucher Picker** ⇄ **M9-B2 Toko Voucher** & **M9-C1 Voucher Platform** — picker baru bermanfaat penuh setelah B2 & C1 ready, tapi bisa rilis bertahap.
- **M11-A8 Variant Multi-Axis** — sentuh data layer luas, lakukan di akhir milestone supaya tidak block fitur lain.
- **M13-A1 Follow Toko** → prasyarat **M13-B2 Broadcast Promo** (fan-out ke follower).
- **M14-B1 Badge Reputasi** ⇄ **M10-A10 Filter Search** — filter `officialStoreOnly` butuh flag `Shop.isOfficialStore` dari B1; kerjakan B1 dulu atau stub flag-nya.
- **Prioritas harga** (helper shared, urutan menang): Flash Sale (M15-C1) > Sale Price (M9-B3) > Harga Grosir (M13-B1) > harga normal — siapa pun yang mengerjakan duluan membuat helper `getUnitPrice`, yang berikutnya extend.

### Quality gate sebelum merge
- [ ] `npx tsc --noEmit` zero error
- [ ] `npx next lint` zero warning
- [ ] Manual test golden path + 1 edge case sesuai Acceptance
- [ ] Migration (jika ada) jalankan di local dev tanpa error, include script rollback kalau destructive
- [ ] Update doc ini (Status, Owner) + entry CHANGELOG

---

## 📚 Lampiran

- Design tokens: lihat [apps/web/tailwind.config.ts](apps/web/tailwind.config.ts) & [apps/web/src/app/globals.css](apps/web/src/app/globals.css)
- Component library handoff: [design_handoff_tokopudidi/README.md](design_handoff_tokopudidi/README.md)
- Schema reference: [packages/database/prisma/schema.prisma](packages/database/prisma/schema.prisma)
- Riwayat milestone selesai: [CHANGELOG.md](CHANGELOG.md)
