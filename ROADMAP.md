# 🗺️ Tokopudidi — Roadmap M7–M15

> **Status dokumen**: Draft 3 · Terakhir di-update: **2026-07-29**
> **Sumber kebenaran** untuk milestone setelah M6. Setiap item adalah unit pekerjaan yang bisa di-klaim per orang/tim.
>
> **Perubahan Draft 3 (2026-07-29)** — spesifikasi seluruh item M11–M15 diperdetail hasil audit kode, supaya tiap item bisa langsung dikerjakan tanpa audit ulang: tiap item kini punya section **Konteks kode** (file/baris terverifikasi + pola existing yang harus ditiru) dan **Jebakan**. Koreksi rencana lama yang basi: M14-A1 login berbasis **phone** (bukan email) → flow Google OAuth jadi 2 langkah; M14-A2 OTP berbasis phone → re-scope ke email event transaksional; M14-B1 `Shop.isOfficialStore` sudah ada sejak M10-A10 (tanpa migration); M13-B1 kolom snapshot bernama `OrderItem.price` (bukan `priceAtPurchase`); M13-B2 ternyata butuh migration enum `NotificationType`; M11-B4 metrik ATC di-drop (CartItem dihapus saat checkout, tidak ada data historis); M15-C1 butuh kolom snapshot baru `OrderItem.flashSaleItemId` untuk pelepasan kuota.
>
> **Progress (2026-07-29)** — **M11-B1 Etalase Toko** (butuh migration `m11_b1_shop_showcase`) & **M11-B4 Statistik Produk** (tanpa migration) selesai. Sisa M11: **A8 Variant Multi-Axis** — item terbesar milestone ini, menyentuh data layer luas dan butuh migration 4 tahap.
>
> **Progress terbaru (2026-07-27)** — **M10 selesai (menunggu review)**: A5 QRIS Mock UX ([PR #30](https://github.com/mansyur007/tokopudidi/pull/30)), A10 Filter Search Lengkap ([PR #31](https://github.com/mansyur007/tokopudidi/pull/31)), A7 Komplain/Return. Ketiganya butuh migration, jadi jalankan `prisma migrate deploy` saat merge. Milestone berikutnya yang bebas di-klaim: **M11**.
>
> **Progress (2026-07-08)** — **M9 selesai & merged ke `main`**: A4 Voucher Picker ([PR #24](https://github.com/mansyur007/tokopudidi/pull/24)), B2 Toko Voucher ([PR #25](https://github.com/mansyur007/tokopudidi/pull/25)), C1 Voucher Platform ([PR #26](https://github.com/mansyur007/tokopudidi/pull/26)), B3 Sale Price ([PR #27](https://github.com/mansyur007/tokopudidi/pull/27)). Milestone berikutnya yang bebas di-klaim: **M10**.
>
> **Progress (2026-07-07)** — **M8 selesai & merged ke `main`**: A3 Diskusi Produk ([PR #18](https://github.com/mansyur007/tokopudidi/pull/18)), A6 Order Tracking + AWB ([PR #21](https://github.com/mansyur007/tokopudidi/pull/21)), C2 Report/Pelaporan ([PR #22](https://github.com/mansyur007/tokopudidi/pull/22)), B6 Template Reply Chat ([PR #23](https://github.com/mansyur007/tokopudidi/pull/23)).
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
- **Status**: 🟢 DONE · **Owner**: Claude
- **Deliver notes** (2026-07-08): helper `getEffectivePrice`/`getDiscountPct`/`getSaleRemainingMs` di `packages/shared/src/utils/price.ts` — dipakai API (product list/related/for-you/wishlist/recent via `toProductCard`, cart, checkout) & FE (detail page, BuyBox). Response card kirim `price` = harga efektif + `originalPrice`/`discountPct`/`saleEndAt` saat sale aktif; detail endpoint kirim raw fields (FE hitung via helper). Snapshot harga tersimpan di `OrderItem.price` (kolom existing — bukan `priceAtPurchase`). Catatan: sort "termurah" tetap pakai kolom `price` DB (harga normal) — mismatch kecil selama sale, diterima. Prioritas harga lintas-milestone terdokumentasi di helper.
- **Scope**: Produk punya harga coret + sale price dengan periode. Card render badge "-XX%", detail render countdown jika sale berakhir < 24 jam.
- **Schema diff**: `Product.salePrice Int?` `Product.saleStartAt DateTime?` `Product.saleEndAt DateTime?`
- **API**: helper `getEffectivePrice(product, now)` di shared package, sertakan `originalPrice` + `discountPct` di response.
- **UI touch**:
  - [apps/web/src/components/product/ProductCard.tsx](apps/web/src/components/product/ProductCard.tsx) — harga coret + sale price + badge persen
  - [apps/web/src/components/product/BuyBox.tsx](apps/web/src/components/product/BuyBox.tsx) — subtotal pakai effective price + countdown component
  - Seller product form: section "Diskon Periodik"
- **Acceptance**:
  - [x] Badge "-25%" muncul saat `salePrice` aktif & dalam periode
  - [x] Setelah `saleEndAt` lewat, fallback ke `price` original tanpa intervensi
  - [x] Countdown muncul kalau sisa < 24 jam
  - [x] Order yang dibuat selama sale menyimpan harga effective di `OrderItem.price` (kolom existing)
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
- **Status**: 🟢 DONE · **Owner**: Claude
- **Deliver notes** (2026-07-26): rencana awal menulis "tidak ada migration" — **keliru**: status `EXPIRED` belum ada di enum `OrderStatus`, jadi tetap butuh migration aditif (`m10_a5_order_status_expired`). `EXPIRED` dipilih daripada memakai ulang `CANCELLED` supaya kedaluwarsa otomatis bisa dibedakan dari pembatalan oleh orang. Batas waktu **derived** (`createdAt + 15 menit`, konstanta `QRIS_EXPIRY_MINUTES`) — tidak ada kolom `expiresAt` baru. Expiry pakai **lazy-check** (bukan cron): dicek saat buka detail pesanan, saat ambil `/qris`, saat simulate-paid, plus sapuan kecil per-buyer saat buka daftar pesanan; stok dikembalikan lewat helper `restoreStock` yang kini dipakai bersama `cancelOrder`. QR di-render server-side jadi PNG data URI (`qrcode` npm) — FE cukup `<img>`, tidak ada library QR di bundle client. `POST /orders/:id/pay` dipertahankan sebagai alias yang kini lewat flow simulate-paid yang sama (bukan auto-paid). Checkout dengan QRIS langsung diarahkan ke `/pesanan/[id]/bayar` karena hitungan mundur mulai saat order dibuat.
- **Sudah ada** (M3): `QRIS_MOCK` di enum `PaymentMethod`, radio metode bayar di checkout (COD/Transfer/QRIS), `POST /api/v1/orders/:id/pay` yang langsung auto-paid.
- **Scope (delta)**: ganti auto-paid jadi flow realistis — halaman bayar render QR code + countdown 15 menit, tombol "Saya sudah bayar (mock)" terpisah untuk simulate webhook, order expired otomatis kalau lewat batas waktu.
- **Schema**: `OrderStatus` + nilai `EXPIRED` (migration aditif).
- **Library**: `qrcode` (npm) untuk render data URI server-side atau `react-qr-code` client-side. _(deliver: `qrcode` server-side)_
- **API**:
  - `GET /api/v1/orders/:id/qris` → `{ qrString, qrImageDataUrl, amount, expiresAt, expired }`
  - `POST /api/v1/orders/:id/qris/simulate-paid` → set status PAID + paidAt (dev/mock only — production akan diganti webhook PSP); `POST /orders/:id/pay` jadi alias flow yang sama
- **UI touch**:
  - [apps/web/src/app/(buyer)/pesanan/[id]/bayar/page.tsx](apps/web/src/app/(buyer)/pesanan/[id]/bayar/page.tsx) — branching by paymentMethod: QRIS render QR + countdown
  - Baru: `apps/web/src/components/order/QrisPanel.tsx` — QR + hitung mundur + tombol simulate
- **Acceptance**:
  - [x] User pilih QRIS di checkout → halaman bayar render QR + countdown 15 menit
  - [x] Tombol simulate-paid → status order PAID, redirect ke detail
  - [x] Setelah 15 menit, status order EXPIRED (cron atau lazy-check) — _deliver: lazy-check_
  - [x] Bank transfer & COD flow lama tetap jalan tanpa regresi
- **Effort**: S

---

### M10-A7. Komplain / Return Beyond Refund
- **Status**: 🟢 DONE · **Owner**: Claude
- **Deliver notes** (2026-07-27): id pakai `uuid()` mengikuti model lain (rencana menulis `cuid()`). Ditambahkan `@@unique([orderItemId])` — satu item hanya bisa dikomplain sekali, kelanjutannya lewat escalate; plus timestamp `respondedAt`/`escalatedAt` supaya alurnya bisa diaudit. **Tambahan di luar rencana**: buyer boleh escalate juga kalau seller **diam** lebih dari 2 hari (`COMPLAINT_SELLER_RESPONSE_DAYS`) — tanpa ini komplain menggantung selamanya di status OPEN kalau seller tidak menanggapi. Sisi uang: logika settlement refund (kembalikan stok, tarik saldo seller, set order REFUNDED) diekstrak dari `admin.refund.routes` jadi helper bersama `settleOrderRefund`, lalu dipakai saat komplain berakhir REFUND (seller terima maupun admin menangkan buyer) — jadi aturan saldo hanya hidup di satu tempat. Resolusi REPLACEMENT sengaja tidak menyentuh uang: hanya mencatat keputusan + notifikasi, pengiriman barang pengganti di luar sistem. Endpoint list buyer di `GET /api/v1/complaints` (bukan `/api/v1/me/complaints`) mengikuti pola router aplikasi. Respons seller & keputusan admin pakai `prompt()` — konsisten dengan aksi order existing, bukan form modal.
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
  - `POST /api/v1/complaints/:id/escalate` (buyer setelah seller reject / seller diam > 2 hari)
  - `POST /api/v1/admin/complaints/:id/decide` body `{ outcome: "RESOLVED"|"REJECTED", note }`
  - `GET /api/v1/complaints` _(deliver: bukan `/api/v1/me/complaints`)_, `/api/v1/seller/complaints`, `/api/v1/admin/complaints`
- **UI**:
  - Tombol "Komplain" di buyer order detail (hanya muncul jika DELIVERED + dalam window)
  - Halaman buyer `/komplain`, seller `/seller/komplain`, admin `/admin/komplain` — kartu bersama `ComplaintCard`, form `ComplaintModal`
- **Acceptance**:
  - [x] Tombol "Komplain" hilang setelah window 2 hari lewat
  - [x] Seller bisa accept (langsung set RESOLVED + refund diproses kalau resolusinya REFUND) atau reject
  - [x] Setelah reject, buyer punya tombol "Naikkan ke Admin"
  - [x] Admin keputusan final, tidak bisa di-escalate lagi
- **Effort**: L

---

### M10-A10. Filter Search Lengkap
- **Status**: 🟢 DONE · **Owner**: Claude
- **Hasil audit** (2026-07-26): API `listProducts` sudah punya `q`, `categoryId/Slug`, `shopId`, `province`, `minPrice`, `maxPrice`, `minRating`, `condition`, `sort`. Yang belum ada: **sidebar filter sama sekali** (halaman `/cari` hanya punya SortBar dengan 2 dropdown), plus param `cities`, `officialStoreOnly`, `freeShipping`, `cod`.
- **Deliver notes** (2026-07-26): nama param mengikuti yang sudah dipakai kode (`minPrice`/`maxPrice`/`minRating`), bukan `priceMin`/`ratingMin` seperti tertulis di rencana. `cod` & `freeShipping` **tidak berhenti di flag pencarian** — keduanya ditegakkan di checkout supaya filternya tidak jadi janji kosong: COD ditolak kalau ada item `codAvailable=false` (server + radio COD ter-disable di FE), ongkir jadi 0 hanya kalau **seluruh** item satu toko bebas ongkir. `Product.codAvailable` default **true** (bukan false seperti rencana) supaya produk lama tidak mendadak kehilangan opsi COD. `Shop.isOfficialStore` ikut ditambahkan di sini beserta toggle admin (`POST /admin/shops/:id/official-store`) — badge & helper `getShopBadge` tetap milik M14-B1; catatan: halaman produk saat ini masih menampilkan label "Official Store" dari `ktpVerified`, perlu dirapikan di M14-B1. "Count match per filter" dibatasi ke jumlah produk per kota (grup Lokasi) + total hasil di header sidebar — faceting penuh per filter tidak sepadan untuk sekarang. Filter rating & kondisi dipindah dari SortBar ke sidebar supaya tidak ada dua UI yang bersaing.
- **Scope**: Lengkapi sidebar filter di `/cari` dengan harga range, kondisi, rating min, lokasi, Official Store, bebas ongkir.
- **Schema diff**: `Product.codAvailable Boolean @default(true)`, `Product.freeShippingEligible Boolean @default(false)`, `Shop.isOfficialStore Boolean @default(false)` (migration `m10_a10_search_filters`).
- **API**: extend `listProducts` query params: `minPrice`, `maxPrice`, `minRating`, `cities` (comma-separated), `condition`, `officialStoreOnly`, `freeShipping`, `cod`. Baru: `GET /api/v1/products/cities` (opsi lokasi + jumlah produk), `POST /api/v1/admin/shops/:id/official-store`.
- **UI**: sidebar collapsible groups, count per kota, "Reset Filter" button. Baru: `apps/web/src/app/(buyer)/cari/FilterSidebar.tsx`. Seller product form dapat section "Opsi Pengiriman".
- **Acceptance**:
  - [x] Filter rating min 4★ → produk dengan ratingAvg ≥ 4
  - [x] Multi-city filter dengan OR semantics
  - [x] URL sync (shareable filter state)
- **Effort**: M

---

### M11-B1. Etalase / Showcase Toko ⭐
- **Status**: 🟢 DONE · **Owner**: Claude
- **Deliver notes** (2026-07-29): reorder pakai endpoint `POST /:id/move` (`{direction}`) yang **menulis ulang seluruh urutan jadi 0..n-1**, bukan menukar dua nilai `order` — kolom `order` bisa kembar/bolong dari data lama dan swap dua nilai akan diam-diam gagal kalau nilainya sama; logic-nya diekstrak ke `showcase.order.ts` supaya bisa diuji tanpa DB. Assign produk **replace-all** (array kosong = kosongkan etalase) dengan dedupe sebelum `createMany` — id kembar akan menabrak PK gabungan. Picker produk di FE memakai **pencarian server-side** (debounce 250ms, limit 50): filter client-side hanya menyaring halaman pertama sehingga produk yang ada tampak "tidak ditemukan". Header toko diekstrak jadi `ShopHeader` karena kini dipakai dua halaman. Visibilitas produk di etalase sengaja memakai filter yang sama persis dengan `listProducts` (`isActive` + `deletedAt: null` + `stock > 0`) supaya angka di tab konsisten dengan grid "Semua Produk". **Ditemukan saat audit**: `GET /shops/:slug` — endpoint yang diubah item ini — sebelumnya tidak punya cakupan e2e sama sekali, jadi ditambahkan `e2e/showcase.spec.ts` (TC-125–128); TC baru ini perlu didaftarkan di TestForge.
- **Scope**: Seller kelompokkan produk dalam folder ("Best Seller", "Diskon"), tampil sebagai tab di halaman toko.
- **Konteks kode (audit 2026-07-29)**:
  - Halaman toko [apps/web/src/app/(buyer)/toko/[slug]/page.tsx](apps/web/src/app/(buyer)/toko/[slug]/page.tsx) **belum punya tab bar** — hanya section header + grid produk. Tab "Semua" = grid existing.
  - Route publik toko: `shopRouter.get('/:slug')` di [apps/api/src/modules/shop/shop.routes.ts](apps/api/src/modules/shop/shop.routes.ts#L24).
  - Registrasi router seller di [apps/api/src/app.ts](apps/api/src/app.ts#L102-L108) — tambahkan `sellerShowcaseRouter` → `/api/v1/seller/showcase`.
  - **Pola yang ditiru**: ChatTemplate M8-B6 ([seller.chatTemplate.routes.ts](apps/api/src/modules/seller/seller.chatTemplate.routes.ts) + `ChatTemplateManager`) — CRUD + reorder tombol ▲▼ (swap kolom `order`), bukan drag-and-drop.
- **Schema**:
  ```
  model ShopShowcase {
    id        String   @id @default(uuid())   // uuid, bukan cuid — konsisten model lain
    shopId    String
    shop      Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
    name      String
    slug      String
    order     Int      @default(0)
    createdAt DateTime @default(now())
    products  ShopShowcaseProduct[]
    @@unique([shopId, slug])
    @@index([shopId, order])
  }
  model ShopShowcaseProduct {
    showcaseId String
    showcase   ShopShowcase @relation(fields: [showcaseId], references: [id], onDelete: Cascade)
    productId  String
    product    Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
    order      Int @default(0)
    @@id([showcaseId, productId])
  }
  ```
  Tambah relasi balik: `Shop.showcases ShopShowcase[]`, `Product.showcaseItems ShopShowcaseProduct[]`.
- **API**:
  - Seller: `GET/POST/PUT/DELETE /api/v1/seller/showcase`, `POST /api/v1/seller/showcase/:id/products` (bulk assign, replace-all), `DELETE /api/v1/seller/showcase/:id/products/:productId`, `POST /api/v1/seller/showcase/:id/move` (▲▼ swap order — pola chat template)
  - Public: include `showcases` (id, name, slug, productCount) di `GET /api/v1/shops/:slug`; produk per etalase via `GET /api/v1/shops/:slug/showcase/:showcaseSlug` (paginated, lewat `toProductCard` yang sama supaya harga sale M9-B3 ikut)
- **UI**:
  - Seller panel baru `apps/web/src/app/seller/etalase/page.tsx` — list + create modal + product picker multi-select dari produk toko; tambah menu di `SellerShell.tsx`
  - Halaman toko — tab bar atas (tab "Semua" + satu tab per etalase); route `apps/web/src/app/(buyer)/toko/[slug]/etalase/[showcaseSlug]/page.tsx`
- **Jebakan**:
  - Bulk assign **wajib validasi kepemilikan**: semua `productId` harus `shopId` milik seller (query `findMany where id IN … AND shopId` lalu bandingkan count) — tanpa ini seller bisa menempelkan produk toko lain ke etalasenya.
  - Etalase tanpa produk aktif disembunyikan dari respons publik, tapi tetap tampil di panel seller.
  - `slug` dibuat dari `name` saat create dan **stabil setelahnya** (URL shareable) — rename hanya mengubah `name`.
  - Hapus etalase hanya menghapus baris join (cascade), bukan produknya.
  - Max 10 etalase per toko, max 50 produk per etalase (guard zod + UI).
- **Acceptance**:
  - [x] Produk bisa ada di > 1 etalase
  - [x] Etalase tanpa produk (aktif) tidak ditampilkan ke buyer
  - [x] Reorder etalase via tombol ▲▼ (konsisten M8-B6)
  - [x] Assign produk toko lain → 403, tidak ada partial write
  - [x] Harga di tab etalase identik dengan grid "Semua" (sale price ikut)
- **Effort**: M

---

### M11-B4. Statistik Produk Detail
- **Status**: 🟢 DONE · **Owner**: Claude
- **Deliver notes** (2026-07-29): tanpa migration — semua dari data existing. **Chart tidak memakai library**: isinya cuma 7–30 batang dari satu deret angka, sementara recharts menambah ~100 KB gzipped ke panel seller yang halamannya kini ~115 KB; dibuat komponen `DailyBarChart` (CSS bar + `<title>` tooltip + tabel `sr-only` untuk pembaca layar). Pindah ke library kalau nanti butuh sumbu ganda/zoom/multi-seri. Kunci hari dibuat dari **komponen tanggal lokal**, bukan `toISOString().slice(0,10)` — yang terakhir mengonversi ke UTC sehingga batang jatuh ke kolom yang salah kalau TZ server bukan UTC (`seller.dashboard.routes` masih memakai pola lama itu, layak dirapikan terpisah). Di FE, `formatTanggal('YYYY-MM-DD')` juga diparse sebagai UTC, jadi label diberi sufiks `T00:00:00`. `REVENUE_STATUSES` disamakan persis dengan `weekRevenue` di dashboard supaya angka pendapatan tidak beda antar-halaman. Produk toko lain dibalas **404, bukan 403**, supaya keberadaan produknya tidak bocor. Konversi boleh > 100% (pembeli yang melihat sebelum rentang tetap terhitung pembeli) — ditampilkan apa adanya dengan penjelasan di UI, tidak di-clamp.
- **Scope**: Seller lihat per-produk: penonton unik per hari (chart), total view, terjual, revenue, conversion.
- **Konteks kode (audit 2026-07-29)** — dua fakta yang memaksa re-scope dari rencana lama:
  - **`ProductView` di-upsert** per (userId/sessionKey, productId) — `viewedAt` di-overwrite saat dilihat ulang. Agregat per-hari dari `ProductView.viewedAt` = "penonton unik yang terakhir lihat hari itu" (aproksimasi), **bukan** pageview historis. `Product.viewCount` = counter kumulatif sesungguhnya.
  - **`CartItem` dihapus saat checkout** — data ATC historis tidak ada. **Metrik ATC di-drop** dari scope; jangan bangun event-log baru hanya untuk ini.
  - Pola agregasi harian sudah ada di [seller.dashboard.routes.ts](apps/api/src/modules/seller/seller.dashboard.routes.ts#L11-L70) (loop hari + `prisma.aggregate`) — tiru.
  - **Belum ada chart library** di `apps/web/package.json` (hanya next/react/zustand) — tambah `recharts`, render via `next/dynamic` `ssr: false` supaya tidak membebani SSR.
- **Metrik yang di-deliver**:
  - Chart: penonton unik per hari (dari `ProductView.viewedAt`, label jujur "penonton unik (aproksimasi)")
  - Angka: `viewCount` total, `soldCount`, revenue & order count dari `OrderItem` join `Order.status IN (PAID…COMPLETED)`, conversion = pembeli unik ÷ penonton unik (guard division-by-zero → 0%)
- **API**: `GET /api/v1/seller/products/:id/stats?range=7d|30d` — guard kepemilikan produk via `seller.middleware` + cek `product.shopId`.
- **UI**: Baru `apps/web/src/app/seller/produk/[id]/statistik/page.tsx` + link/icon 📈 dari tabel produk seller ([apps/web/src/app/seller/produk/page.tsx](apps/web/src/app/seller/produk/page.tsx)).
- **Acceptance**:
  - [x] Chart 30 hari render, hari tanpa view tetap muncul sebagai 0 (bukan bolong)
  - [x] Conversion dengan 0 view → tampil `—`, tidak NaN/crash _(deliver: `null` dari API, bukan 0% — 0% menyiratkan ada penonton yang tidak membeli)_
  - [x] Tabel order terakhir yang memuat produk ini (nomor order, qty, status, link)
  - [x] Produk milik toko lain → 404
- **Effort**: S

---

### M11-A8. Variant Kombinasi Multi-Axis
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Refactor variant dari single-axis (`name`) jadi multi-axis (warna × ukuran). Stock & priceModifier per kombinasi.
- **Konteks kode (audit 2026-07-29)** — siapa saja yang memegang `ProductVariant` sekarang:
  - Model: `ProductVariant { name, priceModifier, stock, isActive }` ([schema.prisma:299](packages/database/prisma/schema.prisma#L299)) — direferensikan `CartItem.variantId` dan `OrderItem { variantId, variantName }` (snapshot).
  - BuyBox: state `variantId` tunggal + chips ([BuyBox.tsx:111-123](apps/web/src/components/product/BuyBox.tsx#L111-L123)); harga = `getEffectivePrice + priceModifier` (:67).
  - Seller form: `state.variants` array flat di [ProductForm.tsx](apps/web/src/components/seller/ProductForm.tsx#L46) (418 baris — form sudah padat, matrix editor jadi komponen terpisah).
  - Checkout: harga per item di [order.service.ts:152](apps/api/src/modules/order/order.service.ts#L152) — **tidak berubah**, `priceModifier` tetap milik `ProductVariant`.
- **Prinsip desain**: **`ProductVariant` dipertahankan** (id tetap → FK dari CartItem/OrderItem aman); yang baru hanya lapisan option/value + tabel join. Kolom `name` di-drop paling akhir.
- **Schema** (additive dulu):
  ```
  model ProductOption {
    id        String   @id @default(uuid())
    productId String
    product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
    name      String   // "Warna", "Ukuran"
    order     Int      @default(0)
    values    ProductOptionValue[]
    @@index([productId, order])
  }
  model ProductOptionValue {
    id        String   @id @default(uuid())
    optionId  String
    option    ProductOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
    value     String   // "Merah", "M"
    order     Int      @default(0)
  }
  model ProductVariantValue {
    variantId     String
    variant       ProductVariant     @relation(fields: [variantId], references: [id], onDelete: Cascade)
    optionValueId String
    optionValue   ProductOptionValue @relation(fields: [optionValueId], references: [id], onDelete: Cascade)
    @@id([variantId, optionValueId])
  }
  // ProductVariant: + values ProductVariantValue[], + imageUrl String? (opsional per rencana)
  ```
- **Migration plan (4 tahap, jangan digabung)**:
  1. Migration additive: 3 tabel baru + relasi.
  2. **Backfill via script terpisah** di `scripts/` (bukan di SQL migration): per produk yang punya variants → buat `ProductOption` "Varian" + 1 value per `variant.name` + link `ProductVariantValue`. Idempotent (skip produk yang sudah punya option).
  3. Switch code path: product detail response + zod di [packages/shared/src/schemas/product.ts](packages/shared/src/schemas/product.ts) kirim struktur nested; BuyBox & ProductForm baca struktur baru. FE+API satu repo, deploy bareng — tidak perlu dual-read lama.
  4. Migration drop `ProductVariant.name` — **terpisah**, setelah verifikasi produksi.
- **UI**:
  - BuyBox: satu kelompok chip per option; value di-disable kalau tidak ada kombinasi aktif+berstok dengan value yang sudah dipilih; kombinasi terpilih lengkap → tampil stok & harga; variant ber-`imageUrl` → ganti gambar utama.
  - Seller: komponen baru `VariantMatrixEditor` — definisikan option+values, auto-generate kombinasi kartesius jadi tabel (baris = kombinasi; kolom stock/priceModifier/aktif).
- **Jebakan**:
  - **Edit variant jangan regenerate row**: match kombinasi lama by value-set, update in place; kombinasi yang hilang → `isActive=false` (bukan delete — masih direferensikan CartItem/OrderItem).
  - Snapshot `OrderItem.variantName` = join values ("Merah / M") — set saat checkout.
  - Guard: max 3 option per produk, total kombinasi ≤ 50 (zod + UI sebelum generate).
  - Cart berisi variant yang di-nonaktifkan → tampil "varian tidak tersedia" di keranjang, blokir checkout item itu (perilaku sama dengan produk nonaktif existing).
- **Acceptance**:
  - [ ] Produk lama (single-axis) tetap render benar setelah backfill, tanpa edit manual
  - [ ] Cart/order lama yang mereferensikan variant lama tetap valid
  - [ ] Pilih "Merah" → ukuran tanpa stok Merah disable
  - [ ] Guard 50 kombinasi bekerja di FE dan API
  - [ ] Drop `name` baru dijalankan setelah semua acceptance lain hijau
- **Effort**: L (paling besar di milestone — kerjakan terakhir supaya tidak block B1/B4)

---

### M12-A11. Mobile Bottom Nav
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Bottom nav fixed 5 icon untuk mobile: Home `/` · Wishlist `/wishlist` · Pesanan `/pesanan` · Notif `/notifikasi` · Akun `/akun`.
- **Konteks kode (audit 2026-07-29)**:
  - [layout.tsx:11](apps/web/src/app/(buyer)/layout.tsx#L11) buyer sudah `<main className="flex-1 pb-20 md:pb-0">` — **ruang bottom nav sudah disiapkan**, tidak perlu ubah padding.
  - Sumber badge sudah ada di [Header.tsx](apps/web/src/components/shell/Header.tsx#L37-L39): `useCartStore.totalQuantity()`, `useWishlistStore.ids.size`, dan `NotifBell` (unread count) — **reuse store yang sama**, jangan fetch ulang. Kalau unread count masih lokal di `NotifBell`, angkat ke store/hook bersama dulu.
  - Icon wishlist di header saat ini `hidden md:inline-grid` — bottom nav jadi akses mobile-nya (konsisten).
- **UI**:
  - Baru: `apps/web/src/components/shell/MobileBottomNav.tsx` — `md:hidden fixed bottom-0 inset-x-0 z-40`, tinggi ~64px + `pb-[env(safe-area-inset-bottom)]` (iOS).
  - Render di [layout.tsx](apps/web/src/app/(buyer)/layout.tsx) buyer saja — **tidak** di (auth)/seller/admin layout.
  - Active state: `/` exact match; lainnya `pathname.startsWith(href)`.
  - **Sembunyikan** di `/checkout`, `/pesanan/[id]/bayar`, dan `/chat` (composer chat butuh bottom penuh) — cek via `usePathname` di komponen (client), bukan di layout.
- **Badge**: wajib = notif unread; opsional = pesanan `PENDING_PAYMENT` (kalau digarap, ambil dari list orders existing dengan filter status, jangan endpoint baru).
- **Acceptance**:
  - [ ] Muncul hanya < md, tidak menutupi konten (padding main sudah ada)
  - [ ] Active state benar di 5 route + nested route (`/pesanan/xxx` → tab Pesanan)
  - [ ] Hidden di checkout, halaman bayar, dan chat
  - [ ] Badge notif konsisten dengan angka di `NotifBell` (satu sumber)
- **Effort**: S

---

### M12-D3. SEO & Meta
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Sitemap dinamis, robots, JSON-LD produk, OG meta per produk/toko/kategori. Domain: `https://toko.emha.space`.
- **Konteks kode (audit 2026-07-29)**:
  - **Belum ada satu pun `generateMetadata`** di `apps/web` — halaman buyer adalah server component yang fetch via `apps/web/src/lib/api/*`; `generateMetadata` bisa pakai helper fetch yang sama (Next dedup request per render).
  - **Sebagian `ProductImage.url` adalah data-URI base64** (upload via FileReader, `express.json` limit 5mb) — data-URI **tidak valid** untuk `og:image`/JSON-LD dan membengkakkan `<head>`. Semua meta image wajib difilter: hanya pakai URL `http(s)`, kalau tidak ada → fallback tanpa og:image.
  - Set `metadataBase` di root layout (`apps/web/src/app/layout.tsx`) → env `NEXT_PUBLIC_SITE_URL`.
- **API**: baru `GET /api/v1/sitemap` — sekali call kembalikan `{ products: [{slug, updatedAt}], shops: […], categories: […] }`, produk aktif saja, cap 5.000 terbaru — lebih hemat daripada crawling endpoint list paginated.
- **Files**:
  - Baru: `apps/web/src/app/sitemap.ts` + `apps/web/src/app/robots.ts` (disallow: `/admin`, `/seller`, `/akun`, `/checkout`, `/keranjang`, `/chat`, `/scrap`)
  - [produk/[slug]/page.tsx](apps/web/src/app/(buyer)/produk/[slug]/page.tsx) — `generateMetadata()` + JSON-LD `Product`: `offers.price` = **harga efektif** (`getEffectivePrice` — konsisten M9-B3), `priceCurrency: "IDR"`, `availability` dari stock, `aggregateRating` hanya jika `ratingCount > 0`
  - Sama untuk `/toko/[slug]` & `/kategori/[slug]` (OG title/description saja, tanpa JSON-LD Product)
- **Acceptance**:
  - [ ] `/sitemap.xml` valid, berisi produk/toko/kategori + lastmod
  - [ ] Google Rich Results Test pass untuk halaman produk (dengan & tanpa rating)
  - [ ] Produk yang semua gambarnya data-URI → meta tetap valid tanpa og:image (tidak menyisipkan base64 ke head)
  - [ ] Harga di JSON-LD = harga sale saat sale aktif
- **Effort**: S

---

### M12-D4. Image Optimization Audit
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Audit pemakaian `<img>` mentah, konversi yang layak ke `next/image`, rapikan `remotePatterns`.
- **Konteks kode (audit 2026-07-29)** — `<img>` dipakai di **17 file**, terbagi dua kelas:
  1. **Data-URI / preview upload — biarkan `<img>`** (next/image tidak mengoptimasi data-URI): `QrisPanel.tsx` (QR PNG data-URI), `ComplaintModal/Card`, `ReportModal`, `ProductForm`, `pesanan/[id]/bayar` (bukti bayar), `ChatRoom` (gambar base64), `seller/daftar` (preview KTP).
  2. **URL remote — konversi ke `next/image`**: [ProductReviews.tsx:192](apps/web/src/components/product/ProductReviews.tsx#L192), thumbnail di tabel admin (`banner`, `laporan`, `produk`, `refund`, `toko`) & seller (`pembayaran`, `ulasan`, `pesanan/ulasan`).
  - `remotePatterns` saat ini hanya `picsum.photos`, `images.unsplash.com`, `placehold.co` ([next.config.js:10-14](apps/web/next.config.js#L10-L14)).
- **Langkah pertama (wajib)**: cek proporsi nyata URL vs data-URI di DB — `SELECT left(url,30), count(*) FROM "ProductImage" GROUP BY 1` — kalau mayoritas data-URI, konversi kelas 2 tetap jalan tapi penambahan `remotePatterns` produksi menunggu ada host media http nyata (MinIO belum diekspos via URL publik).
- **Catatan**: gambar data-URI yang tampil di list panjang (chat, komplain) sebaiknya diberi `loading="lazy"` — perbaikan murah tanpa next/image.
- **Acceptance**:
  - [ ] Semua `<img>` tersisa punya alasan (data-URI/preview) — tercatat di PR
  - [ ] Konversi tidak merusak layout (dimensi/fill diuji di mobile & desktop)
  - [ ] Lighthouse "Properly size images" pass di halaman produk & ulasan
- **Effort**: S

---

### M12-C3. Audit Log Aksi Admin
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Catat semua aksi tulis admin (siapa, apa, kapan, payload) — append-only + viewer.
- **Konteks kode (audit 2026-07-29)**:
  - Guard admin = `requireRole('ADMIN')` ([middleware/auth.ts:28](apps/api/src/middleware/auth.ts#L28)); route admin tersebar di `admin.*.routes.ts` ([app.ts:111-121](apps/api/src/app.ts#L111-L121)).
  - **Inventaris aksi yang wajib dicatat** (dari route existing): suspend/unsuspend user, verify KTP, toggle official store (M10-A10), takedown/restore produk, resolve refund, resolve report, decide komplain (M10-A7), CRUD voucher platform, CRUD banner, CRUD kategori.
- **Implementation**: helper eksplisit — **bukan** middleware otomatis (lebih jelas & testable):
  ```ts
  // apps/api/src/lib/adminLog.ts
  export function logAdmin(adminId, action, opts?: { targetType?, targetId?, payload?, note? }): void
  // fire-and-forget: void prisma.adminLog.create(...).catch(err => logger.error(...))
  ```
  Dipanggil setelah aksi sukses di tiap route; **tidak di-`await`** di jalur respons (acceptance ≤100ms otomatis terpenuhi).
- **Schema**: model `AdminLog` sesuai rencana lama (id uuid, adminId, action string konstanta `"TAKEDOWN_PRODUCT"` dst, targetType/targetId, payload Json, note, createdAt; index `[adminId, createdAt]` + `[action, createdAt]`). Tanpa route delete — append-only by construction.
- **UI**: Baru `apps/web/src/app/admin/log/page.tsx` — filter adminId/action/rentang tanggal + pagination; tambah entry nav di [AdminShell.tsx:10-20](apps/web/src/components/admin/AdminShell.tsx#L10-L20) (array `navItems`, emoji 📜).
- **Acceptance**:
  - [ ] Semua aksi di inventaris di atas tercatat (checklist di PR)
  - [ ] Log gagal ditulis → aksi utama tetap sukses, error masuk pino
  - [ ] Viewer filter & paginated; tidak ada endpoint hapus/edit log
- **Effort**: S

---

## B. Hasil audit vs Tokopedia — M13–M15 (ditambahkan 2026-07-03)

> Gap terhadap fitur Tokopedia yang **belum ada di kode dan belum tercakup M7–M12**. Fitur yang sudah ternyata ada (mode libur toko, share produk, COD, QRIS mock) tidak dibuatkan item. Fitur out-of-scope (payment gateway real, live shopping, TopAds, koin/loyalty, afiliasi) tetap di luar lingkup sesuai scope guard.

### M13-A1. Follow / Favorit Toko ⭐
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Buyer follow toko dari halaman toko, lihat daftar di `/akun/toko-favorit`, unfollow. Halaman toko tampilkan follower count. Prasyarat M13-B2 Broadcast.
- **Konteks kode (audit 2026-07-29)**:
  - `GET /shops/:slug` di [shop.routes.ts:24](apps/api/src/modules/shop/shop.routes.ts#L24) — `isFollowing` butuh auth opsional; middleware **`optionalAuth` sudah ada** ([apps/api/src/middleware/optionalAuth.ts](apps/api/src/middleware/optionalAuth.ts)).
  - **Pola yang ditiru persis**: wishlist M7-A1 — optimistic toggle + redirect `/masuk?return=` untuk guest ([apps/web/src/store/wishlist.ts](apps/web/src/store/wishlist.ts)).
  - `followerCount` via `_count.followers` include — **jangan** kolom counter (skala belum butuh).
- **Schema**: model `ShopFollower` sesuai rencana lama (id uuid composite `@@id([shopId, userId])`, index `[userId, createdAt]`) + relasi balik `Shop.followers`, `User.followedShops`.
- **API**: `POST`/`DELETE /api/v1/shops/:slug/follow` · `GET /api/v1/users/me/following?page=&limit=` (registrasi pattern `users/me/*` di [app.ts:94-96](apps/api/src/app.ts#L94-L96)) · `GET /shops/:slug` + `followerCount` & `isFollowing`.
- **UI**: tombol Follow/Following + count di header toko ([toko/[slug]/page.tsx](apps/web/src/app/(buyer)/toko/[slug]/page.tsx) — header section sekitar baris 33-63); halaman baru `/akun/toko-favorit` (grid toko, tombol unfollow inline).
- **Acceptance**:
  - [ ] Logged-out klik Follow → redirect `/masuk` dengan return URL (pola M7-A1)
  - [ ] Toggle optimistic, count update tanpa reload; double-click tidak double-insert (upsert/skipDuplicates)
  - [ ] Unfollow dari `/akun/toko-favorit` langsung remove dari grid
- **Effort**: S

---

### M13-A2. Invoice Pesanan (Buyer)
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Halaman invoice printable per pesanan (print-to-PDF browser, bukan PDF generator).
- **Konteks kode (audit 2026-07-29)**:
  - **Pola print sudah ada**: `apps/web/src/app/seller/pesanan/[id]/print/page.tsx` — tiru layout + media-query print-nya.
  - Data lengkap tanpa join produk hidup: `Order.buyerAddress`/`shopAddress` (Json snapshot), `OrderItem.productName/variantName/price/subtotal` (snapshot), `promoCode`/`discountAmount`/`shippingCost`/`total`.
  - `GET /api/v1/orders/:id` existing sudah guard buyer pemilik — **tidak perlu API baru**.
- **UI**:
  - Baru: `apps/web/src/app/(buyer)/pesanan/[id]/invoice/page.tsx` — nomor invoice = `INV/{orderNumber}`, rincian item, ongkir, diskon (kalau ada), total, metode bayar, alamat snapshot
  - [pesanan/[id]/page.tsx](apps/web/src/app/(buyer)/pesanan/[id]/page.tsx) — tombol "Lihat Invoice", tampil hanya untuk status `PAID | PROCESSING | SHIPPED | DELIVERED | COMPLETED` (bukan PENDING_PAYMENT/CANCELLED/EXPIRED/REFUNDED)
- **Acceptance**:
  - [ ] Hanya buyer pemilik yang bisa akses (guard existing)
  - [ ] Status di bawah PAID / dibatalkan → tombol tidak muncul & akses langsung di-redirect
  - [ ] `window.print()` → 1 halaman A4 rapi, tombol/nav tersembunyi via `print:hidden`
- **Effort**: S

---

### M13-B1. Harga Grosir (Tiered Pricing)
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Seller set harga bertingkat per kuantitas (max 5 tier). BuyBox render tabel tier + harga mengikuti qty; cart/checkout ikut.
- **Konteks kode (audit 2026-07-29)** — titik integrasi harga (semuanya terverifikasi):
  - Kontrak prioritas terdokumentasi di [packages/shared/src/utils/price.ts:1-3](packages/shared/src/utils/price.ts#L1-L3): Flash Sale > Sale Price > **Grosir** > normal.
  - Call sites yang harus pindah ke helper baru: checkout [order.service.ts:152](apps/api/src/modules/order/order.service.ts#L152), cart [cart.service.ts:41](apps/api/src/modules/cart/cart.service.ts#L41), `toProductCard` di product.service (card tetap tampil harga satuan qty=1 — tabel tier hanya di BuyBox).
  - **Koreksi rencana lama**: kolom snapshot bernama `OrderItem.price` — `priceAtPurchase` tidak pernah ada (sudah dikoreksi di deliver notes M9-B3).
- **Schema**: model `ProductWholesaleTier` sesuai rencana (id uuid, productId, minQty, price, `@@unique([productId, minQty])`, onDelete Cascade) + relasi `Product.wholesaleTiers`.
- **Helper** (extend `price.ts`, bukan file baru):
  ```ts
  // tier menang hanya kalau lebih murah dari harga efektif (kontrak "min", lihat M9-B3/M15-C1)
  getUnitPrice(p: SalePriceFields & { wholesaleTiers?: {minQty; price}[] }, qty: number, now?: Date): number
  ```
  Variant `priceModifier` **ditambahkan setelah** `getUnitPrice` (konsisten pola existing di order.service:152).
- **Validasi** (zod di [packages/shared/src/schemas/seller.ts](packages/shared/src/schemas/seller.ts) / product schema): max 5 tier, `minQty` naik monoton mulai ≥ 2, `price` turun monoton dan < harga normal.
- **UI**:
  - [BuyBox.tsx](apps/web/src/components/product/BuyBox.tsx) — tabel tier + harga satuan/subtotal update saat qty berubah
  - [ProductForm.tsx](apps/web/src/components/seller/ProductForm.tsx) — section "Harga Grosir" (pola section "Diskon Periodik" di :234)
  - Keranjang — harga satuan item ikut tier saat qty diedit (cart.service sudah hitung server-side, FE refresh)
- **Acceptance**:
  - [ ] Validasi monoton bekerja di FE dan API
  - [ ] Qty naik melewati tier → harga satuan & subtotal berubah di BuyBox, cart, checkout (konsisten server-side)
  - [ ] `OrderItem.price` menyimpan harga tier saat checkout
  - [ ] Produk sedang sale: harga = `min(salePrice, tierPrice)` — tercakup unit test helper
- **Effort**: M

---

### M13-B2. Broadcast Promo ke Follower
- **Status**: ⚪ BLOCKED (butuh M13-A1) · **Owner**: _belum di-klaim_
- **Scope**: Seller kirim pengumuman ke semua follower via notifikasi in-app. Rate-limited 1×/24 jam per toko.
- **Konteks kode (audit 2026-07-29)**:
  - **Koreksi rencana lama**: enum `NotificationType` ([schema.prisma:52-58](packages/database/prisma/schema.prisma#L52)) belum punya `SHOP_BROADCAST` → item ini **butuh migration** (enum aditif + model `ShopBroadcast`).
  - Notifikasi selama ini dibuat inline `prisma.notification.create` per-module — untuk fan-out pakai `createMany` batch (chunk 500), dijalankan **setelah respons** (fire-and-forget + log), bukan di jalur request.
  - Rate limiter existing ([middleware/rateLimit.ts](apps/api/src/middleware/rateLimit.ts)) per-IP — tidak cocok; cek `ShopBroadcast.sentAt` terakhir di DB.
- **Schema**: model `ShopBroadcast` sesuai rencana + kolom `recipientCount Int @default(0)` (riwayat perlu tahu jangkauan) + relasi `Shop.broadcasts`.
- **API**:
  - `POST /api/v1/seller/broadcast` — validasi: sentAt terakhir ≥ 24 jam (429 kalau belum), follower > 0 (400 "belum ada follower" — bukan sukses kosong), `productId` (opsional) milik toko sendiri; `linkUrl` notif = `/toko/[slug]` atau `/produk/[slug]`
  - `GET /api/v1/seller/broadcast` — riwayat + recipientCount
- **UI**: halaman sendiri `apps/web/src/app/seller/broadcast/page.tsx` (form title/body/product-picker + riwayat) + menu di `SellerShell.tsx`.
- **Acceptance**:
  - [ ] Broadcast ke-2 dalam 24 jam → 429 dengan pesan sisa waktu
  - [ ] Follower dapat notif tipe `SHOP_BROADCAST`, klik → toko/produk terkait
  - [ ] Fan-out 1000 follower tidak menahan respons (batch async)
  - [ ] Toko tanpa follower → 400 dengan pesan jelas
- **Effort**: M

---

### M14-A1. Login dengan Google (OAuth)
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Tombol "Masuk dengan Google" di `/masuk` & `/daftar`; akun baru via Google, linking ke akun existing.
- **Konteks kode (audit 2026-07-29)** — kendala yang mengubah desain lama:
  - Identitas utama = **phone**: `User.phone` wajib & unique, login = phone+password ([auth.service.ts:75-89](apps/api/src/modules/auth/auth.service.ts#L75)), `User.email` opsional, `passwordHash` non-null.
  - Konsekuensi: **akun Google baru tidak bisa langsung dibuat** (tidak punya phone) → flow 2 langkah di bawah. Rencana lama "auto-register" tidak berlaku.
- **Flow**:
  1. `POST /api/v1/auth/google` `{ credential }` → verifikasi via `google-auth-library` (audience = `GOOGLE_CLIENT_ID`):
     - payload `sub` match `User.googleId` → login (token pair existing)
     - payload email match `User.email` **dan `email_verified: true`** → set `googleId`, login
     - tidak match → **jangan buat user**; balas `{ needsPhone: true, ticket }` — ticket = JWT 5 menit (payload `{googleId, email, name, avatarUrl}`, sign pakai [lib/jwt.ts](apps/api/src/lib/jwt.ts) existing)
  2. `POST /api/v1/auth/google/complete` `{ ticket, phone }` → validasi ticket + phone belum terpakai → create user (`passwordHash: null`, `googleId` terisi) → token pair. Verifikasi phone via OTP mengikuti flow existing (tidak blokir login pertama — konsisten register biasa).
- **Schema diff**: `User.googleId String? @unique`, `User.passwordHash String?` (nullable).
- **Jebakan**: semua pemakai `bcrypt.compare` wajib guard null — [auth.service.ts:87](apps/api/src/modules/auth/auth.service.ts#L87) (login form akun OAuth-only → error "Akun ini terdaftar via Google — gunakan tombol Masuk dengan Google") dan `resetPassword` (:142, reset justru jadi cara akun OAuth menambah password — biarkan jalan, set hash).
- **UI**: komponen client `GoogleButton` (Google Identity Services script) di [(auth)/masuk/page.tsx](apps/web/src/app/(auth)/masuk/page.tsx) & daftar; state `needsPhone` → form nomor HP inline.
- **ENV**: `GOOGLE_CLIENT_ID` (api) + `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (web) → `.env.example` + env VPS.
- **Acceptance**:
  - [ ] Google baru → diminta phone → akun terbuat, langsung masuk
  - [ ] Email Google (verified) = email akun existing → login ke akun itu, `googleId` terisi
  - [ ] Akun OAuth-only login via form password → error jelas, bukan 500
  - [ ] Ticket kadaluarsa/diubah → 401, tidak ada user setengah jadi
- **Effort**: M

---

### M14-A2. Email Transaksional
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope (re-scope 2026-07-29)**: email event transaksional untuk user yang **punya email**. **OTP phone mock TETAP** — rencana lama "ganti OTP mock dengan email" tidak 1:1: OTP existing berbasis phone ([otp.service.ts](apps/api/src/modules/auth/otp.service.ts) — console mock, purpose REGISTER/LOGIN/RESET_PASSWORD) dan `User.email` opsional, jadi email tidak bisa jadi jalur wajib tanpa membuat email required (di luar scope).
- **Event yang dikirim** (semua: skip diam-diam kalau `user.email` kosong):
  - Order dibuat → buyer (rincian + instruksi bayar)
  - Order dibayar → owner toko (info order masuk)
  - Order dikirim + resi → buyer
  - Komplain/refund diputus → buyer
  - Welcome saat register dengan email terisi
- **Implementation**:
  - `apps/api/src/lib/email.ts` — nodemailer transport dari ENV; **ENV kosong → log-only mode** (dev tidak wajib MailHog); `sendMail(to, subject, html)` fire-and-forget, tidak di-`await` di jalur respons (pola sama `prisma.notification.create` yang inline di service)
  - Template HTML inline sederhana (fungsi per event) — tanpa template engine
  - Call sites = titik transisi status yang **sudah** memanggil `prisma.notification.create` di `order.service` / `payment.service` / `complaint.service` — tempelkan di sebelahnya
  - `docker-compose.yml` dev: service `mailhog` (SMTP :1025, UI :8025) — opsional
- **ENV**: `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM` → `.env.example`; prod pakai Resend/Brevo free tier.
- **Acceptance**:
  - [ ] Dev + MailHog: 5 event di atas tertangkap dengan isi benar
  - [ ] ENV SMTP kosong → app jalan normal, email cuma ke log
  - [ ] SMTP down → checkout/aksi tetap sukses, error email di pino
  - [ ] User tanpa email → tidak ada error, tidak ada kiriman
- **Effort**: M

---

### M14-B1. Badge Reputasi Toko
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Badge otomatis dari performa + Official Store. Tampil di ProductCard, halaman produk, halaman toko. **Termasuk membayar utang M10-A10** (label official yang salah sumber).
- **Konteks kode (audit 2026-07-29)** — koreksi rencana lama:
  - `Shop.isOfficialStore` **sudah ada** ([schema.prisma:193-195](packages/database/prisma/schema.prisma#L193)) berikut toggle admin `POST /api/v1/admin/shops/:id/official-store` + kolomnya di halaman admin toko (semua dari M10-A10) → **item ini tanpa migration & tanpa endpoint admin baru**.
  - Utang yang dibayar di sini: halaman produk menampilkan label "Official Store" dari `ktpVerified` (deliver notes M10-A10), dan header toko menampilkan ✅ dari `ktpVerified` ([toko/[slug]/page.tsx:43](apps/web/src/app/(buyer)/toko/[slug]/page.tsx#L43)) — keduanya ganti ke badge helper.
- **Logic**: helper pure `getShopBadge(shop)` di `packages/shared` (sebelah `price.ts`):
  `OFFICIAL` (isOfficialStore) > `STAR_PLUS` (ktpVerified && ratingAvg ≥ 4.5 && totalSold ≥ 100) > `STAR` (ktpVerified && ratingAvg ≥ 4 && totalSold ≥ 10) > `null`.
- **API**: hitung badge **di API** dan kirim `badge: 'OFFICIAL'|'STAR_PLUS'|'STAR'|null` di `toProductCard` (subset shop di card tidak memuat ratingAvg/totalSold — lebih murah kirim hasil daripada menambah field mentah) + shop detail + product detail.
- **UI**: icon kecil + nama toko di [ProductCard.tsx](apps/web/src/components/product/ProductCard.tsx); badge + tooltip (`title=`) di header toko & halaman produk. Ikon: 🏛️ OFFICIAL / ⭐+ / ⭐ (atau SVG konsisten design token).
- **Acceptance**:
  - [ ] Badge berubah otomatis saat kriteria terpenuhi (derived saat read, tanpa cron)
  - [ ] OFFICIAL menang atas badge performa
  - [ ] Tidak ada lagi label official/✅ bersumber `ktpVerified` di halaman produk & toko
  - [ ] Tooltip menjelaskan arti tiap badge
- **Effort**: M (mengecil dari rencana — schema & admin toggle sudah ada)

---

### M14-B2. Bulk Edit Stok & Harga
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Mode edit inline di tabel produk seller — harga/stok/aktif banyak produk, simpan sekali klik. (CSV import tetap out-of-scope.)
- **Konteks kode (audit 2026-07-29)**: tabel di [apps/web/src/app/seller/produk/page.tsx](apps/web/src/app/seller/produk/page.tsx); router [seller.product.routes.ts](apps/api/src/modules/seller/seller.product.routes.ts); zod di [packages/shared/src/schemas/seller.ts](packages/shared/src/schemas/seller.ts).
- **API**: `PATCH /api/v1/seller/products/bulk` body `{ items: [{ id, price?, stock?, isActive? }] }`, max 50 item:
  - Kepemilikan: `findMany({ where: { id: { in }, shopId } })` → count ≠ payload → **403 tanpa partial write**
  - `$transaction` semua update; respons `{ updated: n }`
  - **Guard sale price (M9-B3)**: kalau produk punya `salePrice` dan `price` baru ≤ `salePrice` → tolak baris itu (422 dengan daftar id bermasalah) — jangan diam-diam membuat sale mati
- **UI**: tombol "Edit Massal" → cell harga/stok jadi input + checkbox aktif, dirty-tracking (hanya kirim baris berubah), tombol Simpan/Batal sticky bottom; validasi client harga ≥ 100, stok ≥ 0.
- **Acceptance**:
  - [ ] Edit 20 produk → 1 request, 1 transaksi
  - [ ] Produk toko lain di payload → 403, tidak ada yang tersimpan
  - [ ] Price baru ≤ salePrice aktif → error per-baris dengan pesan jelas
  - [ ] Baris tidak diubah tidak ikut terkirim
- **Effort**: S

---

### M15-C1. Flash Sale (Event Terjadwal)
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Admin buat event (nama, periode, slot produk: harga khusus + kuota). Homepage section countdown + `/flash-sale`; kuota atomik di checkout. Beda dari M9-B3: terpusat, dikurasi admin, ber-kuota.
- **Konteks kode (audit 2026-07-29)** — titik integrasi:
  - Harga checkout per item: [order.service.ts:152](apps/api/src/modules/order/order.service.ts#L152); kontrak prioritas di [price.ts:1-3](packages/shared/src/utils/price.ts#L1-L3) — **flash menang atas sale price**. Helper pure tidak bisa query DB → resolusi flash dilakukan di API: kalau ada `FlashSaleItem` aktif ber-kuota untuk produk → pakai `salePrice` flash; else jalur `getEffectivePrice` (+grosir M13-B1 kalau sudah ada).
  - **Pelepasan kuota** saat order batal: `restoreStock` ([apps/api/src/modules/order/stock.ts](apps/api/src/modules/order/stock.ts)) sudah dipakai cancel + expiry QRIS (M10-A5) + refund settlement ([refund.settlement.ts](apps/api/src/modules/order/refund.settlement.ts), M10-A7) — decrement `soldCount` flash **di titik yang sama**. Supaya tahu item mana yang flash → **snapshot `OrderItem.flashSaleItemId String?`** (kolom baru, di luar rencana lama tapi wajib — tanpa ini pelepasan kuota tidak akurat).
  - Countdown UI: pola sudah ada di `QrisPanel.tsx` (countdown 15 menit) — tiru.
  - Admin: router baru `admin.flashSale.routes.ts` daftar di [app.ts:111-121](apps/api/src/app.ts#L111); nav [AdminShell.tsx:10-20](apps/web/src/components/admin/AdminShell.tsx#L10) (⚡).
- **Schema**: `FlashSale` + `FlashSaleItem` sesuai rencana lama (ganti `cuid()` → `uuid()`, konsisten) + `OrderItem.flashSaleItemId String?` + relasi.
- **Kuota atomik** (race guard):
  ```ts
  // dalam transaksi checkout, per item flash:
  const r = await tx.flashSaleItem.updateMany({
    where: { id, soldCount: { lte: quota - qty } },   // quota dibaca sebelumnya di tx
    data:  { soldCount: { increment: qty } },
  });
  // r.count === 0 → kuota habis → fallback harga normal (JANGAN gagalkan checkout)
  ```
- **Validasi admin**: `salePrice` < `Product.price`; produk yang sama tidak boleh ada di 2 event yang periodenya overlap (tolak saat save); warning (bukan blokir) kalau kuota > stok produk.
- **API**: admin CRUD + kelola items; public `GET /api/v1/flash-sales/active` → event berjalan + items (product card nested + sisa kuota + `endAt`).
- **UI**: section "⚡ Flash Sale" di homepage ([apps/web/src/app/(buyer)/page.tsx](apps/web/src/app/(buyer)/page.tsx)) — countdown + progress bar kuota; `/flash-sale` list penuh; `/admin/flash-sale`.
- **Acceptance**:
  - [ ] Kuota habis → "Habis" di UI, checkout pakai harga normal tanpa error
  - [ ] Race kuota terakhir: uji integrasi 2 checkout paralel (pola `payment.test.ts`) → tepat 1 dapat harga flash
  - [ ] Order flash di-cancel/expired/refund → `soldCount` turun kembali (via titik restoreStock)
  - [ ] Lewat `endAt` → section hilang tanpa intervensi; harga kembali normal
  - [ ] Prioritas: flash > sale (M9-B3) > grosir (M13-B1) — update komentar kontrak di `price.ts`
- **Effort**: L

---

### M15-B1. Pre-Order
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Produk ditandai pre-order dengan lead time X hari. Badge di card/BuyBox/cart/checkout; estimasi proses di order detail. Murni informasi — **tidak ada SLA otomatis** (tidak ada auto-cancel di kode, jangan tambah).
- **Schema diff**: `Product.isPreorder Boolean @default(false)`, `Product.preorderDays Int?` (1–90), **+ snapshot `OrderItem.preorderDays Int?`** — supaya estimasi di order lama tidak berubah saat seller mengubah setting produk (pola snapshot yang sama dengan `productName`/`price`).
- **Konteks kode (audit 2026-07-29)**: [ProductForm.tsx](apps/web/src/components/seller/ProductForm.tsx) sudah punya pola section toggle ("Diskon Periodik" :234, "Opsi Pengiriman" :329) — section "Pre-Order" mengikuti; zod refine di [packages/shared/src/schemas/product.ts](packages/shared/src/schemas/product.ts): `isPreorder: true` → `preorderDays` wajib 1–90; `false` → server null-kan.
- **UI**:
  - Badge "Pre-Order · N hari" di [ProductCard.tsx](apps/web/src/components/product/ProductCard.tsx), [BuyBox.tsx](apps/web/src/components/product/BuyBox.tsx), item keranjang, item checkout
  - Order detail buyer ([pesanan/[id]/page.tsx](apps/web/src/app/(buyer)/pesanan/[id]/page.tsx)) — catatan di stage PROCESSING: "estimasi diproses s.d. {paidAt + maxDays} " dengan `maxDays = max(items.preorderDays)` (hari kalender, sederhana)
- **Acceptance**:
  - [ ] Badge konsisten di card, detail, cart, checkout
  - [ ] Checkout campur ready + pre-order → estimasi pakai lead time terlama
  - [ ] Toggle off → `preorderDays` ter-clear di DB
  - [ ] Seller ubah lead time setelah ada order → estimasi order lama tidak berubah (snapshot)
- **Effort**: S–M

---

### M15-D1. PWA (Manifest + Installable)
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Installable di Android/desktop — manifest + ikon + theme color. Service worker/offline **tidak** termasuk.
- **Konteks kode (audit 2026-07-29)**:
  - `apps/web/public/` **belum ada** — buat. Ikon sumber: `apps/web/src/app/icon.svg` (favicon brand, commit `3dfd290`).
  - Export PNG 192/512 + varian maskable (safe zone ~20% padding) via script sekali-jalan (sharp sebagai devDependency atau tool eksternal) — **commit hasil PNG-nya**, script tidak masuk build.
- **Files**:
  - Baru: `apps/web/src/app/manifest.ts` (Next 14 metadata route) — `name: "Tokopudidi"`, `short_name`, `start_url: "/"`, `display: "standalone"`, `background_color: "#ffffff"`, `theme_color` = primary dari [tailwind.config.ts](apps/web/tailwind.config.ts), icons 192/512 + maskable
  - Root layout: export `viewport`/`themeColor` sesuai API Next 14
- **Catatan keputusan**: tanpa service worker, kriteria installability Chrome terbaru umumnya masih terpenuhi dengan manifest lengkap; kalau prompt tidak muncul saat verifikasi → tambah SW no-op minimal dan catat di PR (jangan diam-diam menambah offline caching).
- **Acceptance**:
  - [ ] Chrome Android tawarkan "Add to Home Screen"
  - [ ] Lighthouse installable check pass
  - [ ] Ikon (termasuk maskable) & splash benar saat launch dari home screen; theme color = brand
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
| 🟢 **M9 — Voucher & Promo Lengkap** | Konversi | A4 · B2 · B3 · C1 | **DONE** (PR #24–#27) |
| 🟢 **M10 — Komplain & QRIS** | Operasional | A7 · **A5 (QRIS)** · A10 | **DONE** (PR #30, #31, A7) |
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
- **M14-B1 Badge Reputasi** ⇄ **M10-A10 Filter Search** — _resolved_: `Shop.isOfficialStore` + toggle admin sudah dikerjakan di M10-A10; M14-B1 tinggal badge derived + membayar utang label `ktpVerified`.
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
