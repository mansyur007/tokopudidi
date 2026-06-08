# 🗺️ Tokopudidi — Roadmap M7–M12

> **Status dokumen**: Draft 1 · Terakhir di-update: **2026-06-02**
> **Sumber kebenaran** untuk milestone setelah M6. Setiap item adalah unit pekerjaan yang bisa di-klaim per orang/tim.

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

## Konteks: yang sudah ada (M1–M6)

Auth, katalog + search + kategori, cart, checkout (1-order-per-toko), payment mock + bukti bayar, alamat, ongkir per zona, promo code, riwayat order, seller panel (produk/order/keuangan/withdrawal/ulasan), chat realtime, ulasan, notifikasi, admin (user/shop/KTP/produk-takedown/refund/banner/kategori).

Riwayat detail per milestone di [CHANGELOG.md](CHANGELOG.md).

---

## ⚖️ Scope guard (keputusan global)

Hal-hal berikut **eksplisit di luar lingkup MVP** — jangan dikerjakan tanpa diskusi ulang:

| Out-of-scope | Alasan |
|---|---|
| Payment selain `MANUAL_BANK_TRANSFER` & `QRIS` (VA, e-wallet, kartu, paylater, cicilan) | Fokus 2 metode saja untuk MVP. QRIS pakai mock. |
| Web Push Notifications (browser push) | In-app notif (existing) sudah cukup |
| Bulk import produk via CSV | Nice-to-have, overhead besar |
| TopUp & Tagihan real (pulsa, listrik, BPJS) | Hero card kanan boleh tetap UI mock atau dijadikan "Coming Soon" |
| Live shopping / video review | Bukan core marketplace |
| Sponsored ads (TopAds) | Bukan core marketplace |

---

## A. Buyer — fitur

### M7-A1. Wishlist / Favorit ⭐
- **Status**: 🔵 TODO
- **Owner**: _belum di-klaim_
- **Scope**: User bisa simpan produk ke favorit dari ProductCard (hover heart) atau BuyBox, lihat semua wishlist di `/akun/wishlist`, hapus item, lihat badge count di header.
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
  - Baru: `apps/web/src/app/(buyer)/akun/wishlist/page.tsx` — grid feed
  - Baru: `apps/web/src/store/wishlist.ts` — Zustand store mirror pattern cart
- **Acceptance**:
  - [ ] Logged-out user klik heart → redirect ke `/masuk` dengan return URL
  - [ ] Logged-in user klik heart → optimistic toggle, badge update tanpa reload
  - [ ] Halaman `/akun/wishlist` paginated 20/page, empty state ada CTA "Cari Produk"
  - [ ] Hapus dari wishlist langsung remove dari grid tanpa reload
- **Effort**: S

---

### M7-A2. Recently Viewed ("Baru Dilihat") ⭐
- **Status**: 🔵 TODO
- **Owner**: _belum di-klaim_
- **Scope**: Track produk yang dilihat user (atau guest via cookie), tampilkan section "Baru Dilihat" di homepage + halaman `/akun/baru-dilihat`.
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
  - Baru: `apps/web/src/app/(buyer)/akun/baru-dilihat/page.tsx` — list lengkap dengan bulk-delete
- **Acceptance**:
  - [ ] Buka produk → muncul di "Baru Dilihat" homepage
  - [ ] Maksimal 10 di homepage section, link "Lihat Semua"
  - [ ] Guest tetap dapat track via cookie, hilang setelah cookie expire
  - [ ] User bisa hapus per-item di halaman lengkap
- **Effort**: S–M

---

### M7-A9. Search Suggestions / Autocomplete
- **Status**: 🔵 TODO
- **Owner**: _belum di-klaim_
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
  - [ ] Debounce 250ms, fetch saat q.length >= 2
  - [ ] Dropdown 3 section, max 11 items total
  - [ ] Klik suggestion produk → `/produk/[slug]`; kategori → `/kategori/[slug]`; toko → `/toko/[slug]`
  - [ ] Logged-in: 5 riwayat terakhir di atas, bisa hapus per-item
  - [ ] ESC / blur → tutup dropdown
- **Effort**: S

---

### M7-D2. Personalized "Untuk Anda"
- **Status**: 🔵 TODO
- **Owner**: _belum di-klaim_
- **Scope**: Tab "Untuk Anda" di ProductFeed homepage sekarang = bestseller global. Ganti jadi personalized berdasarkan kategori yang sering dilihat user.
- **API**:
  - `GET /api/v1/products/for-you?limit=30` →
    - Logged-in: ambil top 3 kategori dari ProductView 30 hari terakhir + OrderItem, query bestseller di kategori-kategori itu, exclude yang sudah dibeli/dilihat 1 jam terakhir
    - Guest: fallback bestseller global (existing)
- **UI touch**:
  - [apps/web/src/app/(buyer)/page.tsx](apps/web/src/app/(buyer)/page.tsx#L15) — ganti fetch `forYou` dari `listProducts({sort:'bestseller'})` ke endpoint baru
- **Acceptance**:
  - [ ] Logged-in user dengan history → produk yang muncul ada di kategori yang sering dilihat
  - [ ] Guest → fallback bestseller global, tidak error
  - [ ] Response time < 300ms p95 dengan 1k products
- **Effort**: S

---

### M8-A3. Diskusi Produk (Tanya Jawab Publik) ⭐
- **Status**: 🔵 TODO
- **Owner**: _belum di-klaim_
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
  - [ ] Logged-out user lihat diskusi tapi tidak bisa tanya/reply
  - [ ] Pertanyaan dari shop owner ditandai badge "Penjual"
  - [ ] Helpful count bertambah tepat 1× per user
  - [ ] Hapus = soft delete, comment muncul "[Pesan dihapus]"
- **Effort**: M

---

### M8-A6. Order Tracking Timeline + AWB
- **Status**: 🔵 TODO
- **Owner**: _belum di-klaim_
- **Scope**: Order detail menampilkan timeline visual per stage dengan timestamp + input/display nomor resi dengan link kurir.
- **Schema diff**:
  ```
  // Order: tambah field
  trackingNumber   String?
  courierName      String?
  paidAt           DateTime?
  processedAt      DateTime?
  shippedAt        DateTime?
  deliveredAt      DateTime?
  completedAt      DateTime?
  ```
- **API**: status transition di order update set timestamp terkait (`paidAt` saat PAID, dst).
- **UI touch**:
  - [apps/web/src/app/(buyer)/pesanan/[id]/page.tsx](apps/web/src/app/(buyer)/pesanan/[id]/page.tsx) — komponen `<OrderTimeline>`
  - [apps/web/src/app/seller/pesanan/[id]/page.tsx](apps/web/src/app/seller/pesanan/[id]/page.tsx) — form input nomor resi + nama kurir saat transisi ke SHIPPED
- **Acceptance**:
  - [ ] Timeline render 5 stage dengan tick aktif sesuai status saat ini
  - [ ] Stage selesai tampilkan timestamp tanggal+jam
  - [ ] Nomor resi tampil dengan tombol copy
  - [ ] Link kurir berdasarkan `courierName` (mock URL pattern)
- **Effort**: M

---

### M8-C2. Report / Pelaporan
- **Status**: 🔵 TODO
- **Owner**: _belum di-klaim_
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
  - [ ] Form lapor: 5 reason picker + description optional + upload max 3 file
  - [ ] Admin queue filter by status/type
  - [ ] Action "ACTIONED" untuk produk → otomatis takedown produk
  - [ ] User yang laporkan dapat notif keputusan admin
- **Effort**: M

---

### M8-B6. Template Reply Chat
- **Status**: 🔵 TODO
- **Owner**: _belum di-klaim_
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
  - [ ] Max 20 template per toko
  - [ ] Klik template → insert body ke composer (replace, bukan append)
  - [ ] Drag-and-drop reorder (atau input order angka)
- **Effort**: S

---

### M9-A4. Voucher Picker di Checkout
- **Status**: 🔵 TODO
- **Owner**: _belum di-klaim_
- **Scope**: Modal "Pakai Voucher" di checkout, list voucher tersedia dengan tag jenis (Cashback/Diskon/Gratis Ongkir), validasi otomatis.
- **API**:
  - `GET /api/v1/promo/available?subtotal=&shopId=` → `{ eligible: [...], ineligible: [{ promo, reason }] }`
- **UI touch**:
  - [apps/web/src/app/(buyer)/checkout/page.tsx](apps/web/src/app/(buyer)/checkout/page.tsx) — tombol "Pakai Voucher" → modal `<VoucherPicker>`
  - Baru: `apps/web/src/components/checkout/VoucherPicker.tsx`
- **Acceptance**:
  - [ ] Voucher eligible di atas, ineligible di bawah dengan alasan
  - [ ] Radio select → preview perubahan total
  - [ ] Voucher dari toko hanya muncul untuk order toko tsb
  - [ ] Input manual kode tetap tersedia sebagai fallback
- **Effort**: S

---

### M9-B2. Toko Voucher
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Seller bikin voucher khusus tokonya (diskon%/Rp / cashback / gratis ongkir), set kuota & periode & min belanja.
- **Schema diff**: tambah `PromoCode.shopId String?` + index `(shopId, isActive)`.
- **API**: `GET/POST/PUT/DELETE /api/v1/seller/voucher`
- **UI touch**: Baru `apps/web/src/app/seller/promo/page.tsx` (list + form modal)
- **Acceptance**:
  - [ ] Form: kode, diskon (% atau Rp), min belanja, kuota total, kuota per user, mulai-berakhir
  - [ ] Voucher hanya muncul di Voucher Picker (M9-A4) untuk order toko ini
  - [ ] Seller bisa pause/resume voucher
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
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Admin terbit voucher platform-wide (tanpa `shopId` = berlaku semua toko).
- **API**: `GET/POST/PUT/DELETE /api/v1/admin/voucher` (extend admin layer)
- **UI**: Baru `apps/web/src/app/admin/voucher/page.tsx`
- **Acceptance**:
  - [ ] Voucher tanpa shopId muncul di Voucher Picker untuk semua user
  - [ ] Bisa target scope kategori (opsional `categoryId`)
- **Effort**: S

---

### M10-A5. QRIS Mock (Payment Method ke-2) 🆕
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Tambah QRIS sebagai metode bayar kedua di checkout, render QR code + countdown, tombol "Saya sudah bayar (mock)" untuk simulate webhook.
- **Schema**: tambah `QRIS` ke enum `PaymentMethod` jika belum ada.
- **Library**: `qrcode` (npm) untuk render data URI server-side atau `react-qr-code` client-side.
- **API**:
  - `GET /api/v1/orders/:id/qris` → `{ qrString, amount, expiresAt }`
  - `POST /api/v1/orders/:id/qris/simulate-paid` → set status PAID + paidAt (dev/mock only — production akan diganti webhook PSP)
- **UI touch**:
  - [apps/web/src/app/(buyer)/checkout/page.tsx](apps/web/src/app/(buyer)/checkout/page.tsx) — radio "Metode Bayar"
  - [apps/web/src/app/(buyer)/pesanan/[id]/bayar/page.tsx](apps/web/src/app/(buyer)/pesanan/[id]/bayar/page.tsx) — branching by paymentMethod
- **Acceptance**:
  - [ ] User pilih QRIS di checkout → halaman bayar render QR + countdown 15 menit
  - [ ] Tombol simulate-paid → status order PAID, redirect ke detail
  - [ ] Setelah 15 menit, status order EXPIRED (cron atau lazy-check)
  - [ ] Bank transfer flow lama tetap jalan tanpa regresi
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

## 🛠️ OPS — DevOps & Reliability

> Bukan fitur produk, tapi fondasi CI/CD & keandalan produksi. Deploy live: **https://103-169-207-239.sslip.io** (Docker Compose + Caddy + HTTPS).

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
| `A5-legacy` | Multi payment (VA, e-wallet, kartu, paylater) | Lingkup MVP hanya MANUAL_BANK_TRANSFER + QRIS |
| `A12` | Web Push Notifications | In-app notif sudah cukup |
| `B5` | Bulk import CSV produk | Overhead vs nilai MVP |
| `D1` | TopUp & Tagihan real (provider integration) | Optional — UI di HeroCard tetap mock atau "Coming Soon" |

---

## 🗓️ Sequencing milestone

| Milestone | Fokus | Isi | Estimasi |
|---|---|---|---|
| **M7 — Wishlist & Discovery** | Engagement | A1 · A2 · A9 · D2 | ~3 hari |
| **M8 — Trust & Communication** | Transparansi | A3 · A6 · C2 · B6 | ~3–4 hari |
| **M9 — Voucher & Promo Lengkap** | Konversi | A4 · B2 · B3 · C1 | ~2–3 hari |
| **M10 — Komplain & QRIS** | Operasional | A7 · **A5 (QRIS)** · A10 | ~3 hari |
| **M11 — Seller Tools & Variant** | Power-seller | B1 · B4 · A8 | ~4 hari |
| **M12 — Mobile, SEO, Audit** | Polish | A11 · D3 · D4 · C3 | ~2 hari |

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
