# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [SemVer](https://semver.org/).

## [Unreleased] — M14-B2: Bulk Edit Stok & Harga

### Added
- **Edit massal stok & harga** (`M14-B2`) — mode edit inline di daftar produk seller, simpan sekali klik.
  - `PATCH /api/v1/seller/products/bulk` — maks 50 baris, satu `$transaction`, respons `{ updated: n }`.
  - Kepemilikan diperiksa **sebelum** apa pun ditulis: satu id milik toko lain membatalkan seluruh permintaan (403).
  - Tombol "✏️ Edit Massal" di [seller/produk](apps/web/src/app/seller/produk/page.tsx) — harga/stok jadi input, checkbox aktif, bar aksi sticky di bawah dengan hitungan baris berubah.
  - `bulkProductUpdateSchema` + `findBulkPriceConflicts` — 18 unit test.
  - E2E `bulk-edit.spec.ts` (TC-TKPDD-170–173).
- Kelas error `UnprocessableEntityError` (422) — memisahkan "payload cacat" (400) dari "isinya bertabrakan dengan data existing".

### Notes
- **Rencana di ROADMAP kurang satu guard.** Yang tertulis hanya guard `salePrice` (M9-B3), padahal jalur satuan menjaga **dua** hal terhadap penurunan harga: diskon periodik **dan** harga grosir (M13-B1). Tanpa guard kedua, bulk edit jadi pintu belakang untuk membuat harga "grosir" lebih mahal daripada harga biasa. Pembeli memang masih terlindungi kontrak `min` di `getUnitPrice`, tapi datanya sudah telanjur tidak masuk akal. Keduanya kini ditegakkan di sini.
- **`PATCH /bulk` wajib dideklarasikan sebelum `PATCH /:id`.** Express mencocokkan route sesuai urutan pendaftaran; kalau dibalik, permintaannya ditelan `/:id` dengan `id = "bulk"` dan gagalnya muncul sebagai error validasi `productUpdateSchema` yang membingungkan, bukan 404 yang jelas. TC-173 mengunci urutan itu: kalau terbalik, payload tak sah akan menjawab 404, bukan 400.
- **Baris tanpa perubahan ditolak zod.** Baris begitu ikut terhitung di `updated`, sehingga seller diberi tahu "12 produk diperbarui" padahal yang benar-benar berubah lebih sedikit. FE juga sudah menyaringnya lewat dirty-tracking — server jadi jaring kedua, bukan satu-satunya.
- **Id produk kembar dalam satu payload ditolak.** Dua baris untuk produk yang sama membuat nilai akhirnya bergantung urutan array: mana yang menang jadi kebetulan, bukan keputusan.
- **Baris yang tidak mengubah harga sengaja tidak diperiksa konfliknya.** Kalau sebuah produk sudah telanjur punya data harga tidak konsisten dari sebelumnya, memblokir penyesuaian stoknya tidak memperbaiki apa pun — hanya mengunci pekerjaan yang tak ada kaitannya dengan masalahnya.
- **Angka batas di pesan konflik adalah tier tertinggi yang menabrak**, bukan tier pertama yang ditemukan di array — itulah batas yang benar-benar harus dilewati seller. Ada unit test yang membalik urutan array untuk memastikan angkanya tidak ikut berubah.
- **Mode edit tidak ditutup saat 422.** `errors` dikirim per **id produk** sehingga barisnya bisa ditandai masing-masing; menutup mode edit akan membuang semua ketikan yang belum tersimpan.
- **Belum terverifikasi di lingkungan lokal** — Docker baru terpasang tapi engine-nya belum pernah dijalankan, jadi e2e masih bergantung workflow `e2e.yml`. Yang lolos lokal: `tsc` api + web + shared + database, lint, **264 unit test** (18 baru), dan `playwright test --list`.

## [Unreleased] — M14-B1: Badge Reputasi Toko

### Added
- **Badge reputasi toko** (`M14-B1`) — `OFFICIAL` > `STAR_PLUS` > `STAR` > tanpa badge, **diturunkan saat dibaca** dari kolom yang sudah ada. Tanpa migration, tanpa kolom baru, tanpa cron.
  - `getShopBadge` + `getShopBadgeMeta` di `packages/shared/src/utils/badge.ts` — 14 unit test.
  - Badge dikirim **sudah jadi** oleh API di kartu produk, detail produk, detail toko, toko unggulan, dan daftar toko favorit.
  - Komponen `ShopBadgeMark` dipakai di kelima tempat itu — satu ikon, satu tooltip, tidak berbeda antar halaman.
  - E2E `badge.spec.ts` (TC-TKPDD-167–169).

### Fixed
- **Label "Official Store" di halaman produk tidak lagi bersumber `ktpVerified`** (utang `M10-A10`). `ktpVerified` hanya berarti KTP penjualnya sudah dicek admin; "Official Store" adalah status kurasi yang punya kolomnya sendiri (`isOfficialStore`). Menyamakan keduanya membuat **setiap** toko terverifikasi tampil sebagai official store di mata pembeli.
- **Tanda centang ✅ di header toko** berasal dari kekeliruan yang sama dan ikut diganti badge sebenarnya.

### Notes
- **`ktpVerified` dan `isOfficialStore` dihapus dari respons buyer** (`/shops/:slug`, `/shops/featured`, `/products/:slug`). Ini bukan penghematan payload melainkan penutup jalan: selama bahan mentahnya masih terkirim, kekeliruan "hitung ulang aturan di FE" gampang terulang. E2E TC-167 menembak ketiga endpoint untuk memastikan keduanya benar-benar hilang.
- **Enam query yang membangun kartu produk dipusatkan ke `CARD_SHOP_SELECT`.** Listing, related, for-you, wishlist, baru-dilihat, dan produk di halaman toko masing-masing punya `shop: { select: … }` literal sendiri. Kalau field badge ditambahkan satu per satu, cepat atau lambat ada yang tertinggal dan toko yang sama tampil ber-badge di beranda tapi polos di wishlist. Sekarang `CardRow` membuat kelalaian itu jadi error tsc, bukan bug diam.
- **`ShopCard` daftar toko favorit ikut dapat `badge`** — kontraknya memang "sama persis dengan `/shops/featured`", jadi kalau ketinggalan, toko yang sama tampil beda di dua halaman.
- **`ktpVerified` disyaratkan untuk badge performa, tapi tidak untuk `OFFICIAL`.** Official adalah keputusan kurasi admin dan tidak boleh dicabut mesin hanya karena rating sedang turun; sebaliknya badge performa tidak boleh bisa dikarang toko yang identitasnya belum pernah diperiksa lewat segelintir transaksi berating bagus.
- **Ambang badge inklusif** (`>=`), dan unit test-nya memakai konstanta ambang itu langsung — menggeser ambang tidak bisa diam-diam mengubah arti test.
- **Jebakan yang dicegat saat menulis e2e:** percobaan pertama memanggil `/shops/:slug/products`, route yang tidak ada. Karena dibungkus `if (status === 200)`, test-nya akan "lolos" tanpa memeriksa apa pun. Diganti ke `/products?shopId=` dengan assertion tanpa syarat.
- Nilai `ratingAvg`/`totalSold` di seed acak, jadi e2e **tidak pernah menuntut badge tertentu** dari data seed. Yang diperiksa adalah perubahannya saat flag official di-toggle admin lalu dikembalikan — sekaligus bukti badge memang diturunkan saat dibaca, bukan disimpan.
- **Belum terverifikasi di lingkungan lokal** — mesin dev belum punya Postgres/Docker (Docker sedang dipasang), jadi e2e bergantung workflow `e2e.yml`. Yang lolos lokal: `tsc` api + web + shared + database, lint, **246 unit test** (14 baru), dan `playwright test --list`.

## [Unreleased] — M13-B2: Broadcast Promo ke Follower

### Added
- **Broadcast promo ke follower** (`M13-B2`) — seller mengirim satu pengumuman ke seluruh follower tokonya sebagai notifikasi in-app, dibatasi 1× per 24 jam.
  - Enum `NotificationType.SHOP_BROADCAST` + model `ShopBroadcast` (migration `20260801100000_m13_b2_shop_broadcast`, aditif murni).
  - `POST /api/v1/seller/broadcast` — menolak sebelum menulis apa pun kalau: jeda 24 jam belum lewat (429 + sisa waktu), toko belum punya follower (400), atau `productId` bukan milik toko sendiri (400).
  - `GET /api/v1/seller/broadcast` — riwayat + `recipientCount`, digabung dengan `status` (jumlah follower & sisa jeda) supaya halaman seller cukup satu request untuk memutuskan tombol kirim aktif atau tidak.
  - Halaman `/seller/broadcast` (form judul/isi/pilih produk + riwayat) dan menu "📣 Broadcast" di `SellerShell`.
  - `broadcastCooldownRemainingMs` / `canBroadcastNow` / `formatCooldownRemaining` di `packages/shared/src/utils/broadcast.ts` + `broadcastCreateSchema` — 13 unit test.
  - E2E `broadcast.spec.ts` (TC-TKPDD-165–166).

### Fixed
- **Notifikasi diskusi (`NEW_QUESTION`, M8-A3) tidak lagi tampil sebagai "🔔 Sistem".** Union tipe di `apps/web/src/lib/api/notifications.ts` tertinggal saat M8-A3 sehingga tipe itu jatuh ke fallback `TYPE_LABEL.SYSTEM`. Diperbaiki sekalian karena daftar yang sama harus ditambah untuk `SHOP_BROADCAST`.

### Notes
- **Fan-out berjalan setelah respons terkirim** (`res.on('finish')`), bukan di jalur request: 1000 follower berarti round-trip penulisan notifikasi yang sama sekali tidak memengaruhi jawaban untuk seller. Ditulis `createMany` per 500 baris. Konsekuensinya notifikasi tiba beberapa saat setelah 201 — e2e menunggunya dengan `expect.poll`, bukan membaca sekali lalu menyimpulkan gagal.
- **Jeda 24 jam ditegakkan dengan advisory lock per toko, bukan "baca lalu tulis".** Dua klik beruntun sama-sama membaca "belum ada broadcast" sebelum salah satunya sempat menulis, lalu keduanya lolos dan follower menerima notifikasi dobel. `INSERT ... WHERE NOT EXISTS` **juga tidak** menutup celah ini: pada isolasi READ COMMITTED (default Postgres) subquery-nya tidak melihat baris transaksi lain yang belum commit. `pg_advisory_xact_lock(hashtext(shopId))` di dalam transaksi adalah yang benar-benar menyerialkan keduanya, dan hanya menahan pengirim ke toko yang sama.
- **Rate limiter existing (`middleware/rateLimit.ts`) tidak dipakai** — limiter itu per-IP, sedangkan batas ini milik toko: satu seller berpindah jaringan akan lolos, dan dua seller di satu kantor akan saling menghabiskan jatah.
- **Toko tanpa follower = 400, bukan sukses kosong.** Kalau dibiarkan "berhasil", jatah 24 jamnya tetap terpakai untuk kiriman yang tidak sampai ke siapa pun.
- **Produk yang disorot wajib aktif, bukan sekadar milik toko sendiri.** Broadcast tidak bisa ditarik kembali; menautkan ribuan follower ke halaman produk yang sedang dinonaktifkan berarti mengirim tautan mati sekali untuk selamanya. Picker di halaman seller pun hanya memuat produk `ACTIVE`.
- **`SHOP_BROADCAST` dibuat terpisah dari `PROMO`** supaya kiriman massal toko bisa dibedakan (dan nanti dibisukan) tanpa ikut membungkam notifikasi promo yang dipicu aksi user sendiri.
- **`ShopBroadcast.productId` memakai `ON DELETE SET NULL`, bukan cascade.** Baris riwayat itulah yang menahan jendela 24 jam berikutnya — kalau ikut terhapus bersama produknya, seller bisa broadcast lagi seketika.
- **User yang sudah di-soft-delete disaring dari daftar penerima.** Notifikasinya tidak akan pernah dibaca, tapi ikut terhitung di `recipientCount` sehingga angka jangkauan di riwayat mengklaim lebih banyak daripada kenyataannya.
- **Kegagalan fan-out tidak membatalkan baris riwayat** (sudah di luar jalur respons, hanya dicatat ke pino). Pilihan yang disengaja: lebih baik satu kiriman gagal daripada jedanya ikut hilang dan follower dibanjiri percobaan ulang.
- **E2E-nya menuntut DB yang segar** untuk jalur suksesnya, karena jeda 24 jam tidak bisa direset lewat API — dan memang tidak boleh bisa, endpoint reset akan jadi lubang untuk menghindari batasnya di produksi. Pesan gagalnya menyebut `npm run db:seed`. Urutan test di berkas itu juga sengaja: semua pemeriksaan penolakan dijalankan sebelum broadcast yang berhasil, karena setelahnya jeda 24 jam menutup semua jalur lain dengan 429 sebelum sempat sampai ke pemeriksaan yang mau diuji.
- **Belum terverifikasi di lingkungan lokal** — mesin dev tidak punya Postgres/Docker, jadi migration belum pernah diterapkan dan e2e belum pernah dijalankan; keduanya bergantung workflow `e2e.yml`. Yang lolos lokal: `tsc` api + web + shared + database, lint, **232 unit test** (13 baru), dan `playwright test --list`.
## [Unreleased] — Perbaikan: Deploy Menembus Batas Waktu di Lapisan Chromium

### Fixed
- **Deploy tidak lagi mengunduh ulang ~98 MB paket apt setiap commit.** Lapisan `RUN npx playwright install --with-deps chromium` di stage `api` berada **di bawah semua `COPY` kode aplikasi**, sehingga perubahan kode sekecil apa pun membatalkan cache-nya dan memaksa pemasangan ulang 110 paket apt + Chromium. Sekarang lapisan itu ditaruh setelah `COPY node_modules` tapi **sebelum** kode — `npx playwright` butuh node_modules, tidak butuh kode kita.
- **`command_timeout` deploy dinaikkan 25m → 45m.** Bahkan setelah perbaikan urutan lapisan, rebuild tetap wajib saat dependency atau schema Prisma berubah, dan di VPS ini unduhan apt-nya sendirian bisa memakan ~20 menit.

### Notes
- **Kejadiannya** (deploy 2026-07-31, merge PR #46): job mulai 14:11:57 dan mati tepat 25 menit kemudian di `Run Command Timeout`. Build JS-nya sendiri hanya ~4,5 menit; sisanya — **19,5 menit** — habis di satu langkah `apt-get` yang baru sampai paket ke-103 dari 110. Kecepatan unduhnya memang buruk: `libllvm15` (23 MB) sendirian butuh 4 menit 19 detik (~90 KB/s).
- **Produksi tidak ikut turun.** Kegagalannya terjadi di tahap `build`, sebelum `up -d` maupun `prisma migrate deploy`, jadi container lama tetap melayani — `toko.emha.space` diverifikasi masih 200 di `/api/health` dan homepage. Konsekuensinya migration `ProductWholesaleTier` (M13-B1) **belum diterapkan di produksi**; itu baru jalan pada deploy berikutnya yang berhasil.
- Deploy berikutnya **tetap** akan membangun ulang lapisan Chromium sekali, karena M13-B1 mengubah `schema.prisma` dan Prisma client digenerate ke dalam `node_modules`. Sesudah itu barulah deploy yang hanya menyentuh kode ikut ter-cache.
- **Belum dikerjakan:** image `api` membawa Chromium (~330 MB) semata-mata untuk scraper admin (`/admin/scrape`). Memisahkannya jadi service/image sendiri akan membuat image api ramping dan menghapus jalur apt ini dari deploy sepenuhnya — perubahan arsitektur tersendiri, di luar perbaikan ini.

## [Unreleased] — M13-B1: Harga Grosir (Tiered Pricing)

### Added
- **Harga grosir bertingkat** (`M13-B1`) — seller set harga per tingkat kuantitas (maks 5), harga satuan turun otomatis begitu qty melewati ambang.
  - Model `ProductWholesaleTier` (migration `20260731100000_m13_b1_wholesale_tier`) — `@@unique([productId, minQty])` mencegah ambang kembar yang membuat harganya ambigu; index itu sekaligus melayani pengurutan, jadi tidak ada index tambahan.
  - `getUnitPrice(p, qty, now)`, `getWholesaleTierPrice`, dan `getNextWholesaleTier` di `packages/shared/src/utils/price.ts` — 25 unit test.
  - Ditegakkan server di **keranjang** (`cart.service`) dan **checkout** (`order.service`, tersimpan di snapshot `OrderItem.price`), bukan cuma tampilan.
  - BuyBox: tabel tingkat harga dengan baris aktif tersorot, harga satuan + subtotal ikut qty, dan ajakan "Tambah N lagi → Rp X".
  - ProductForm seller: section "📦 Harga Grosir" (tambah/hapus tingkat, aturannya tertulis di form).
  - `WHOLESALE_RULES` di `packages/shared/src/schemas/seller.ts` — satu daftar aturan yang dipakai create **dan** update, jadi pesan penolakannya identik.
  - Seed: "Gula Pasir Gulaku 1kg" diberi 3 tingkat harga supaya jalurnya benar-benar terpakai di dev & e2e.
  - E2E `wholesale.spec.ts` (TC-TKPDD-161–164).

### Fixed
- **`OrderItem.price` dan `subtotal` tidak lagi menghitung rumus harga dua kali.** Sebelumnya rumusnya ditulis ulang di dua baris berdampingan dan wajib selalu identik; sekarang dihitung sekali lalu dipakai bersama. Kalau keduanya sempat berbeda, total order tidak akan sama dengan jumlah subtotal itemnya — e2e TC-162 membandingkan keduanya.

### Notes
- **Kontrak harganya `min`, bukan "tier menang".** Tier hanya dipakai kalau memang lebih murah dari harga efektif saat itu. Tanpa itu, produk yang sedang diskon (M9-B3) justru jadi **lebih mahal** ketika dibeli banyak — kebalikan dari arti kata "grosir". Ada test properti yang menjaga harga satuan tidak pernah naik saat qty bertambah.
- **`getWholesaleTierPrice` sengaja tidak mengandalkan urutan array.** Validasi memang mewajibkan tier terurut, tapi helper ini juga membaca data langsung dari DB yang urutannya tidak dijamin — dan salah pilih tier berarti salah menagih pembeli.
- **Jebakan yang dicegat saat implementasi:** `productUpdateSchema` bersifat partial dan route update men-`spread` sisa payload ke `product.update({ data: rest })`. `wholesaleTiers` wajib ikut di-destructure keluar, kalau tidak Prisma menolaknya saat runtime.
- **Guard tambahan di route update, di luar zod:** menurunkan harga normal saja (tanpa menyertakan tier) akan membuat tier lama diam-diam lebih mahal dari harga biasa. Zod tidak bisa melihat itu karena payload-nya parsial, jadi route memeriksa tier existing terhadap harga hasil update dan menolak 400.
- **`minQty` minimal 2.** Tier ber-`minQty` 1 bukan grosir — itu mengganti harga normal lewat pintu belakang dan menciptakan dua sumber kebenaran untuk harga satuan produk.
- Update bersifat **replace-all**: array kosong berarti mematikan harga grosir, tanpa perlu endpoint terpisah.
- **Temuan di luar lingkup item ini:** `apps/web/next.config.js` memasang `typescript: { ignoreBuildErrors: true }` **dan** `eslint: { ignoreDuringBuilds: true }`. Artinya `npm run build` tidak pernah memeriksa tipe frontend — dan klaim "tsc seluruh workspace lolos" di beberapa PR sebelumnya **tidak berlaku untuk `apps/web`**. Di PR ini tipenya diperiksa terpisah (`npx tsc --noEmit -p apps/web/tsconfig.json`, bersih). Menjadikannya gate CI adalah pekerjaan tersendiri, bersinggungan dengan `OPS-9` di TESTING.md.

## [Unreleased] — M13-A2: Invoice Pesanan (Buyer)

### Added
- **Invoice printable per pesanan** (`M13-A2`) — halaman `/pesanan/[id]/invoice`, dicetak lewat browser (print-to-PDF), bukan generator PDF.
  - Nomor invoice `INV/{orderNumber}`, rincian item, ongkir, diskon, total, metode bayar, dan alamat — semuanya dari **snapshot** yang tersimpan di order, jadi dokumennya tetap memperlihatkan keadaan saat transaksi walau produk atau alamatnya berubah kemudian.
  - Tombol "🧾 Lihat Invoice" di detail pesanan, muncul hanya untuk status `PAID | PROCESSING | SHIPPED | DELIVERED | COMPLETED`.
  - `canViewInvoice` + `invoiceNumber` di `packages/shared/src/utils/invoice.ts` (6 unit test) + e2e `invoice.spec.ts` (TC-TKPDD-159–160).
  - **Tidak ada API baru** — `GET /api/v1/orders/:id` sudah memuat seluruh isinya dan sudah menjaga kepemilikan buyer.

### Fixed
- **`/pesanan/[id]` tidak lagi membuang pemiliknya ke `/masuk` saat dibuka lewat URL langsung.** Halaman ini masih memakai pola lama (`if (!user) router.push('/masuk')` tanpa menunggu rehydrate), yaitu bug yang sama dengan shell admin/seller. Sekarang memakai `useAuthHydrated`.
- **Kerangka aplikasi tidak lagi ikut tercetak.** Header, Footer, BottomNav, dan ChatFab dapat `print:hidden` (plus `print:pb-0` di `main`) — tanpa itu invoice keluar bersama nav dan tombol chat, karena keempatnya dirender layout buyer di setiap halaman.

### Notes
- **Aturan status invoice sengaja hidup di satu tempat.** Kalau tombol dan guard halaman menyimpan daftar status masing-masing, cepat atau lambat tombolnya tampil untuk pesanan yang halamannya menolak. Salah satu unit test menyapu seluruh 9 nilai `OrderStatus` dan membandingkannya dengan `INVOICE_STATUSES`, jadi status baru tidak bisa lolos tanpa keputusan eksplisit.
- **`REFUNDED` tidak dapat invoice** (sesuai rencana): mencetak dokumen yang menyatakan pembayaran atas pesanan yang uangnya sudah dikembalikan justru menyesatkan.
- **Tanpa auto-`window.print()`**, berbeda dengan label pengiriman seller yang memang khusus cetak. Invoice juga dipakai untuk dilihat dan diarsipkan.
- Verifikasi cetaknya di e2e memakai `emulateMedia({ media: 'print' })` — memeriksa elemen yang benar-benar hilang saat media print, bukan menebak nama kelas CSS.
- `shopAddress` pesanan lama (termasuk data seed) hanya berisi `{city, province}` tanpa `name`, jadi nama penjual selalu punya cadangan dari relasi `order.shop`.
- **Temuan yang belum dikerjakan:** halaman buyer lain masih memakai pola guard lama dan karenanya tidak bisa dibuka lewat URL langsung oleh user yang sudah login — `/wishlist`, `/akun`, `/akun/alamat`, `/akun/toko-favorit`, `/komplain`, `/notifikasi`, `/chat`, `/pesanan`. Perbaikannya seragam dan sepele, tapi menyentuh 8+ halaman di luar lingkup item ini.

## [Unreleased] — Perbaikan: Alamat Seed Tidak Bisa Dipakai Checkout

### Fixed
- **Alamat default buyer dari seed sekarang bisa dipakai checkout.** Id-nya harfiah `"seed-addr-budi"`, sedangkan `checkoutSchema.addressId` mewajibkan `z.string().uuid()` — jadi checkout dengan alamat itu selalu ditolak `400 "Invalid uuid"`. Karena `isDefault` diurutkan paling atas di `GET /users/me/addresses`, justru alamat itulah yang pertama dipilih UI maupun test. Seed kini idempoten lewat **kunci alami** (`userId` + `label`) dan membiarkan `@default(uuid())` yang mengisi id.

### Notes
- **Ini bukan temuan baru — jebakannya sudah didokumentasikan** di `cart-checkout.spec.ts` sejak lama ("id seed bukan UUID sehingga ditolak checkoutSchema") dan di-workaround dengan membuat alamat sendiri, tapi sumbernya tidak pernah diperbaiki. Yang membuatnya muncul lagi: e2e invoice (M13-A2) memilih alamat pertama dan langsung gagal di CI.
- **Baris alamat lama sengaja tidak dihapus.** `Order.addressId` pesanan seed lama menunjuk ke sana; menghapusnya akan menabrak FK. Di DB yang sudah ada, barisnya diturunkan dari status default dan label-nya diberi akhiran "(lama)" supaya tidak lagi terpilih pertama. Di DB baru barisnya memang tidak pernah ada.
- Pemakai `db:seed` di DB lama akan melihat **dua** alamat buyer setelah ini: yang lama (tidak default, "Rumah (lama)") dan yang baru ber-uuid. Itu disengaja — lebih aman daripada memindahkan FK pesanan.
- `cart-checkout.spec.ts` tetap membuat alamatnya sendiri: alasannya sekarang isolasi, bukan keterpaksaan. Komentarnya diperbarui supaya tidak menyesatkan.

## [Unreleased] — Perbaikan: Guard Halaman Menunggu Hidrasi Sesi

### Fixed
- **`/admin/*`, `/seller/*`, dan `/scrap` bisa dibuka lewat URL langsung lagi.** Sebelum ini,
  admin/seller yang sudah masuk selalu dibuang ke `/masuk` pada setiap muat-ulang penuh atau
  kunjungan dari bookmark. Navigasi dari dalam aplikasi tetap jalan, itu sebabnya luput lama.
  - Akar masalahnya bukan sekadar "rehydrate belum selesai". `zustand` menyerahkan
    `getInitialState` sebagai **server snapshot** ke `useSyncExternalStore`, dan React memakai
    snapshot itu untuk **seluruh render hidrasi**. Jadi pada render pertama di klien `user`
    pasti `null` — kondisi awal store, bukan isi localStorage — walaupun `persist.hasHydrated()`
    sudah `true` (localStorage sinkron; rehydrate-nya rampung saat modul store dievaluasi).
  - Konsekuensinya: **membaca `hasHydrated()` di badan render tidak memperbaiki apa pun.**
    Penanda bahwa snapshot asli sudah dipakai adalah commit pertama. Karena itu
    `useAuthHydrated()` (`apps/web/src/store/auth.ts`) menyalakan flag-nya dari effect, dengan
    `onFinishHydration` sebagai cadangan untuk storage asinkron.
  - `AdminShell` tidak lagi memanggil `router.push` **di badan render** — itu efek samping saat
    render yang React peringatkan lewat "Cannot update a component while rendering a different
    component", dan StrictMode menjalankannya dua kali. Sekarang di effect.
  - Redirect guard memakai `router.replace`, bukan `push`, supaya tombol Back tidak memantul
    kembali ke halaman yang baru saja ditolak.
  - Efek samping yang ikut beres: hydration mismatch di kedua shell. Markup server dan render
    hidrasi kini sama-sama "Memuat...", padahal sebelumnya server merender `null` dan klien
    merender seluruh shell.
- **`SellerShell` kena pola yang sama walau redirect-nya sudah di dalam `useEffect`.** Sempat
  diduga hanya `AdminShell` (yang push-nya di badan render) yang rusak; ternyata effect pun
  berjalan pada commit hidrasi, saat `user` masih `null`. Diverifikasi langsung: dengan sesi
  seller yang sah, `/seller/produk` lewat URL langsung mendarat di `/masuk` sebelum perbaikan.

### Added
- **TC-TKPDD-155 kembali** (`e2e/admin-log.spec.ts`) — dihapus di M12-C3 justru karena bug ini.
  Membuka `/admin/log` lewat URL langsung dengan sesi disuntik ke localStorage (bentuk
  `{ state, version }` milik zustand/persist, token & profil dari API sungguhan), lalu memeriksa
  entri tampil, dropdown aksi berisi 22 opsi, filter aksi memuat ulang, toggle payload
  buka/tutup, dan nav memuat "Jejak Audit".
- `useAuthHydrated()` diekspor dari `apps/web/src/store/auth.ts` — satu pintu untuk semua guard
  yang perlu membedakan "belum login" dari "sesi belum terbaca".

### Notes
- **Pemeriksaan URL ditaruh di akhir test, bukan cuma sesudah `goto()`.** Navigasi klien itu
  asinkron: pada versi yang rusak halaman sempat tergambar utuh lebih dulu, lalu redirect-nya
  menyusul. Test yang hanya memeriksa URL tepat setelah `goto()` lolos secara kebetulan; yang
  memeriksa di akhir gagal 3 dari 3 kali pada kode sebelum perbaikan.
- **Temuan yang belum dikerjakan — halaman pembeli kena pola yang sama.** `akun`, `alamat`,
  `wishlist`, `keranjang`, `checkout`, `pesanan`, `pesanan/[id]`, `pesanan/[id]/bayar`,
  `pesanan/ulasan`, `notifikasi`, `komplain`, dan `chat` semuanya `router.push('/masuk')` di
  effect tanpa menunggu hidrasi, jadi pembeli yang membookmark halamannya juga terbuang ke
  login. Perbaikannya sama persis (`useAuthHydrated`), tapi 12 berkas dengan keputusan tampilan
  "memuat" masing-masing di luar lingkup PR ini.
- **Temuan yang belum dikerjakan — nama aksesibilitas filter `/admin/log` berantakan.** Tiap
  filter dibungkus `<label>` yang memuat `<span>` judul **dan** `<select>`-nya, sehingga nama
  aksesibilitas select ikut menyerap seluruh teks option ("Aksi Semua aksi Tangguhkan
  pengguna …"). Itu sebabnya TC-155 memakai locator struktural alih-alih `getByLabel`.
- **Tabrakan id TC saat penggabungan dengan M13-A1: `follow-shop.spec.ts` dinomori ulang ke
  156–158.** M13-A1 memakai TC-TKPDD-155–157 karena 155 terlihat kosong — memang kosong, sebab
  M12-C3 baru saja menghapus test-nya justru karena bug hidrasi ini. Git tidak melihat tabrakan
  itu (berkasnya berbeda), tapi TestForge memetakan hasil lewat id, jadi dua test berbeda akan
  melapor ke satu case yang sama. TC-155 dikembalikan ke pemilik aslinya, viewer `/admin/log`,
  yang case manualnya sudah terdaftar; TC M13-A1 memang **belum** didaftarkan (tercatat di
  bagiannya sendiri), jadi menggesernya belum mengganggu riwayat apa pun.
- **Guard di sini sengaja belum memakai return URL.** M13-A1 baru menambahkan `safeReturnPath`
  dan dukungan `?return=` di `/masuk`, dan secara eksplisit memilih tidak meretrofit call site
  lama. Keputusan itu diikuti: `router.replace('/masuk')` di shell admin/seller dibiarkan polos
  supaya PR ini tetap satu topik. Memasang `?return=` di guard-guard ini jadi lanjutan yang
  murah dan jelas berguna — admin yang membookmark `/admin/log` bisa kembali ke sana setelah
  masuk.

## [Unreleased] — M13-A1: Follow / Favorit Toko

### Added
- **Follow toko** (`M13-A1`) — buyer bisa mengikuti toko dan melihat daftarnya.
  - Model `ShopFollower` (migration `20260730120000_m13_a1_shop_follower`) — **tanpa kolom `id`**: PK gabungan `(shopId, userId)` sekaligus jadi penjaga anti-duplikat, plus index `[userId, createdAt]` untuk daftar favorit.
  - `POST`/`DELETE /api/v1/shops/:slug/follow` — keduanya idempoten (upsert & `deleteMany`), jadi klik ganda maupun unfollow ganda tidak pernah jadi error.
  - `GET /api/v1/users/me/following` (paginated, bentuk kartu sama dengan `/shops/featured`) dan `GET /api/v1/users/me/following/ids` untuk status tombol.
  - `GET /api/v1/shops/:slug` kini mengirim `followerCount` (dari `_count.followers`, bukan kolom counter).
  - FE: `ShopFollow` di header toko (tombol + jumlah pengikut), store `follow` (optimistic + rollback, pola wishlist M7-A1), halaman `/akun/toko-favorit` + entri menu 🏬.
  - E2E `follow-shop.spec.ts` (TC-TKPDD-156–158) — **TC baru ini perlu didaftarkan di TestForge.**
    (Semula 155–157; dinomori ulang saat penggabungan, lihat catatan di bagian perbaikan hidrasi.)
- **Halaman `/masuk` kini menghormati `?return=`** — sebelumnya selalu `router.push('/')`. Validasinya di `safeReturnPath` (`packages/shared/src/utils/returnUrl.ts`, 6 unit test) yang menolak URL absolut, `//host` dan `/\host` protocol-relative, path relatif, serta karakter kontrol.

### Notes
- **Acceptance "redirect ke `/masuk` dengan return URL (pola M7-A1)" mengacu pada pola yang tidak pernah ada.** M7-A1 hanya memanggil `router.push('/masuk')` polos dan halaman login tidak membaca parameter apa pun. Jadi dukungan return URL-nya dibuat di item ini. Sengaja tidak sekalian mengubah `ProductCard`/`BuyBox` — itu perubahan perilaku di luar lingkup M13-A1, tapi helper-nya sudah siap dipakai.
- **`isFollowing` sengaja TIDAK ditambahkan ke `GET /shops/:slug`** meski disebut di rencana. Halaman toko dirender di server dan token buyer hidup di `localStorage` (zustand persist), jadi request SSR tidak pernah membawa `Authorization` — nilainya akan selalu `false` sambil menyamar sebagai kebenaran. Status follow diambil client-side dari `/users/me/following/ids`, yang juga dipakai halaman toko favorit untuk menghapus kartu tanpa reload.
- **Jumlah follower dilacak sebagai selisih aksi, bukan dikoreksi dari status follow.** Percobaan pertama mengunci `base = angkaSSR - (following ? 1 : 0)` begitu store selesai memuat; itu meleset satu setiap kali urutan datanya berbeda (mis. flag "sudah dimuat" masih menyala dari sesi guest sebelumnya, sehingga basisnya terkunci sebelum id yang benar datang). `ShopFollow` sekarang hanya menambah/mengurangi 1 setelah aksi user **berhasil** — `initialFollowerCount` dari SSR sudah benar apa adanya, termasuk kalau user ini terhitung di dalamnya.
- **Follow toko sendiri ditolak (400)**, di luar rencana. Kalau dibiarkan, angka follower menipu dan broadcast M13-B2 akan mengirim notifikasi balik ke penjualnya sendiri. Guardnya di server; tombolnya tetap tampil di halaman toko sendiri dan pesan errornya muncul inline (`ShopDetail` publik tidak memuat `ownerId`, jadi FE tidak bisa tahu lebih awal tanpa membocorkan id pemilik toko).
- Follow ke toko yang sudah di-soft-delete ditolak 404, dan daftar favorit menyaring `shop.deletedAt: null` — tanpa itu daftarnya bisa berisi toko hantu yang tidak bisa dibuka.
- **Belum terverifikasi jalan di lingkungan lokal**: mesin ini tidak punya Postgres maupun Docker, jadi migration belum pernah diterapkan dan e2e-nya belum pernah dijalankan. Yang lolos di sini: `tsc` seluruh workspace, 189 unit test, dan `playwright test --list`. Sisanya bergantung pada workflow `e2e.yml` di CI.

## [Unreleased] — M12-C3: Audit Log Aksi Admin

### Added
- **Jejak audit aksi admin** (`M12-C3`) — setiap aksi tulis admin tercatat: siapa, apa, kapan, payload.
  - Model `AdminLog` (migration `20260730100000_m12_c3_admin_log`) — index `[adminId, createdAt]`, `[action, createdAt]`, `[targetType, targetId]`.
  - Helper `logAdmin()` di `apps/api/src/lib/adminLog.ts` — **fire-and-forget**, dipanggil setelah aksinya sukses dan sengaja tidak di-`await`.
  - `GET /api/v1/admin/logs` (filter adminId/action/targetType/targetId/rentang tanggal + paginasi) dan `GET /api/v1/admin/logs/admins` untuk mengisi dropdown pelaku.
  - Halaman `/admin/log` + entri nav 📜 di `AdminShell`. Payload bisa dibuka per entri.
  - `ADMIN_ACTIONS` (21 aksi) + `ADMIN_ACTION_LABEL` + `redactAdminPayload` di `packages/shared/src/schemas/adminLog.ts` — 43 unit test, e2e `admin-log.spec.ts` (TC-TKPDD-149–154).
  - `global-setup` e2e kini juga login sebagai **admin** — suite ini belum pernah butuh token admin.
- **`SCRAPE_TOKOPEDIA` ikut dicatat** meski di luar inventaris rencana. Tidak menulis data kita, tapi menjalankan headless Chromium ke pihak ketiga atas nama platform — justru jenis aksi yang audit log ada untuknya.

### Notes
- **Rencananya melewatkan dua aksi:** suspend & unsuspend **toko**. Inventaris hanya menyebut suspend/unsuspend *user*, padahal `admin.shop.routes.ts` punya endpoint terpisah. Totalnya 20 endpoint tulis admin, 21 aksi, 22 panggilan (`RESOLVE_REFUND` dua kali — route-nya punya cabang setuju & tolak yang masing-masing `return` sendiri).
- **Payload wajib diredaksi, bukan opsional.** `bannerCreateSchema.imageUrl` hanya `z.string().min(5)` dan halaman admin/banner mengunggah lewat `FileReader.readAsDataURL`, jadi mencatat `req.body` apa adanya menaruh base64 megabyte-an di **setiap** baris log. `redactAdminPayload` membuang data-URI (diganti penanda mime + ukuran), memotong string >300 karakter, memangkas array ke 20 elemen, dan membatasi kedalaman objek.
- **FK `AdminLog.adminId` sengaja tanpa `onDelete: Cascade`** — default Prisma di Postgres `ON DELETE RESTRICT`, dan itu yang benar untuk jejak audit: log tidak boleh ikut hilang bersama pelakunya. Aman karena aplikasi ini soft-delete user lewat `deletedAt`.
- **Append-only ditegakkan secara struktural**: router `/admin/logs` hanya punya `GET`. Tidak ada endpoint tulis yang perlu dijaga permission karena endpoint-nya tidak ada.
- Acceptance "semua aksi tercatat" **tidak** hanya dicentang manual — 21 test struktural mem-grep `apps/api/src/modules` dan gagal kalau ada aksi terdaftar tanpa call site.
- Filter `to` dimajukan ke awal hari berikutnya lalu dibandingkan `lt`, bukan `lte` pada tengah malam. Tanpa itu seluruh isi hari terakhir hilang dari hasil filter — ada e2e khusus untuk kasus `from=to=hari ini`.
- ~~**Temuan yang belum dikerjakan:**~~ **SUDAH DIPERBAIKI** — lihat "Perbaikan: Guard Halaman Menunggu Hidrasi Sesi" di atas. `AdminShell` memanggil `router.push('/masuk')` di dalam render saat `user` masih falsy, sementara store auth-nya `zustand/persist`, sehingga **`/admin/*` tidak bisa dicapai lewat URL langsung**; admin yang membookmark `/admin/log` selalu dibuang ke halaman login. Navigasi dari dalam aplikasi tetap jalan, itu sebabnya luput. Dugaan "shell seller kena pola yang sama" terbukti benar. E2E level browser untuk viewer (TC-155) yang dihapus karena ini sudah dikembalikan.

## [Unreleased] — M12-D4: Image Optimization Audit

### Fixed
- **Logo/banner toko dari host sembarang tidak lagi merusak halaman** (`M12-D4`). `logoUrl` & `bannerUrl` diisi seller lewat input teks bebas (validasinya cuma `z.string().min(5)`) lalu dirender `next/image`. Host di luar `images.remotePatterns` ditolak: **di dev `next/image` melempar dan halaman jadi HTTP 500**; di produksi throw-nya dimatikan tapi `/_next/image` menjawab **400** sehingga logonya rusak. Artinya seller bisa merusak halaman tokonya sendiri hanya dengan menempel URL gambar biasa. Hal yang sama berlaku untuk URL hasil scrape (`images.tokopedia.net`) di `/scrap`.
- **`admin/produk` tidak lagi meminta `/placeholder.png` yang 404.** `apps/web/public` tidak pernah ada di repo ini, jadi setiap produk tanpa foto memuat berkas yang tidak ada. Sekarang kotak abu-abu induknya yang jadi placeholder.

### Added
- **`SmartImage`** (`apps/web/src/components/media/SmartImage.tsx`) — satu pintu render gambar yang memilih jalur **per-src**: host terdaftar → `next/image`; data-URI & host tak terdaftar → `<img>` biasa; skema aneh (`data:text/html`, `javascript:`, `//host`) → tidak dirender sama sekali.
- **`classifyImageSrc` + `ALLOWED_IMAGE_HOSTS`** di `packages/shared/src/utils/image.ts` — 15 unit test, plus e2e `image.spec.ts` (TC-TKPDD-145–148) yang mengubah `logoUrl` toko seed ke host asing dan memastikan halaman tokonya tetap 200.
- `images.tokopedia.net` & `assets.tokopedia.net` masuk allowlist — tanpa itu gambar hasil impor scraper selalu rusak.

### Changed
- Seluruh **20 `<img>` mentah** dan **15 pemakai `next/image`** dialihkan ke `SmartImage`. `<img>` mentah kini tinggal **satu** di seluruh `apps/web` (di dalam `SmartImage`), dan jalur itu selalu memasang `loading="lazy"` + `decoding="async"` — yang paling terasa untuk data-URI base64 di daftar panjang (chat, komplain, ulasan).
- `images.remotePatterns` di `next.config.js` **diturunkan** dari `ALLOWED_IMAGE_HOSTS` (`require('@tokopudidi/shared')`) alih-alih ditulis manual, supaya allowlist config dan allowlist runtime tidak bisa berbeda.

### Notes
- **Tidak ada endpoint upload berkas di `apps/api`.** Semua gambar buatan UI adalah data-URI base64 di kolom string (8 pemanggil `FileReader.readAsDataURL`). Konsekuensinya rencana awal item ini keliru: thumbnail admin/seller yang disebut "URL remote" sebenarnya data-URI, dan mengonversinya ke `next/image` tidak memberi apa pun — `next/image` melewati data-URI tanpa optimasi.
- **`remotePatterns` sengaja tetap allowlist eksplisit, bukan `hostname: '**'`.** Wildcard memang menghilangkan error, tapi mengubah `/_next/image` jadi proxy terbuka yang bisa disuruh menarik URL sembarang. Ada test yang menjaga ini (TC-147 + unit test anti-wildcard).
- Foto KTP dan bukti transfer dengan sendirinya tidak pernah lewat `/_next/image`, yang juga berarti tidak ikut ter-cache ke disk server.
- **Temuan yang belum dikerjakan:** `BannerCarousel` di homepage isinya array hardcoded dan tidak pernah merender `Banner.imageUrl` — CRUD banner admin praktis write-only.
- Acceptance "Lighthouse *Properly size images*" belum dicentang: butuh URL publik + DB berisi, jadi langkah pasca-deploy.

## [Unreleased] — M12-D3: SEO & Meta

### Added
- **SEO & metadata** (`M12-D3`) — sitemap dinamis, robots, dan metadata per halaman.
  - `GET /api/v1/sitemap` — satu panggilan mengembalikan slug + `updatedAt` produk aktif (cap 5.000 terbaru), toko, dan kategori. Jauh lebih hemat daripada FE menyusuri endpoint listing paginated.
  - `apps/web/src/app/sitemap.ts` & `robots.ts` (Next metadata route). Robots menutup `/admin`, `/seller`, `/scrap`, `/akun`, `/checkout`, `/keranjang`, `/chat`, `/notifikasi`, dan halaman auth.
  - `generateMetadata` untuk `/produk/[slug]`, `/toko/[slug]`, `/kategori/[slug]` — title, description, canonical absolut, dan Open Graph. Plus `metadataBase` + OG/Twitter default di root layout.
  - JSON-LD `schema.org/Product` di halaman produk.
  - Helper murni di `packages/shared/src/utils/seo.ts` — 23 unit test + e2e `seo.spec.ts` (TC-TKPDD-140–144).

### Fixed
- **`<head>` tidak lagi memancarkan `<link rel="manifest">` ke 404.** Root layout menyetel `manifest: '/manifest.webmanifest'` padahal berkasnya tidak pernah ada. Field itu dilepas; manifest sesungguhnya menyusul di M15-D1 lewat `app/manifest.ts` yang ditautkan Next otomatis.

### Notes
- ⚠️ **ENV baru wajib di produksi: `NEXT_PUBLIC_SITE_URL`** (mis. `https://toko.emha.space`). Sudah ditambahkan ke `.env.example` dan `docker-compose.prod.yml` sebagai build arg **dan** runtime env. Kalau kosong, `metadataBase` jatuh ke `localhost` dan canonical/OG jadi tidak sah bagi crawler.
- **Gambar base64 disaring dari semua metadata.** Upload seller memakai `FileReader.readAsDataURL`, jadi sebagian `ProductImage.url` berisi data-URI — tidak sah sebagai `og:image` dan bisa menggelembungkan `<head>` sampai megabyte. Produk yang semua gambarnya base64 tetap menghasilkan meta sah, hanya tanpa `og:image`.
- Harga JSON-LD memakai **harga efektif** (sale M9-B3 ikut terhitung) agar sama dengan yang dilihat pembeli; harga yang tidak cocok bisa membuat rich result ditolak. `aggregateRating` hanya disertakan saat `ratingCount > 0`.
- `sitemap.ts` mengembalikan entri statis saja kalau API tidak terjangkau, alih-alih melempar — build produksi tidak boleh gagal karena API belum siap. `revalidate = 3600`.

## [Unreleased] — M12-A11: Mobile Bottom Nav

### Changed
- **Bottom nav mobile** (`M12-A11`) — komponen `BottomNav` yang sudah ada disempurnakan (bukan dibuat baru).
  - Susunan tab: **Beranda / Kategori / Wishlist / Pesanan / Akun**. Tab **Chat** digantikan **Wishlist** karena wishlist tidak bisa dijangkau sama sekali dari mobile (header-nya `hidden md:inline-grid`), sementara chat masih punya `ChatFab`.
  - Notifikasi sengaja **tidak** dijadikan tab meski rencana menyebutnya: `NotifBell` di header sudah tampil di mobile, jadi tab notif hanya menduplikasi akses sambil membuang tujuan yang belum punya akses.
  - Ikon emoji diganti `Icon` SVG (menambah `home` & `user`), badge **pesanan belum dibayar**, ruang aman iOS (`env(safe-area-inset-bottom)`), dan nav menyingkir di `/checkout`, `/pesanan/[id]/bayar`, serta `/chat`.
  - Badge memakai `total` dari endpoint daftar pesanan yang sudah ada + param `limit` baru pada client — tanpa endpoint hitung baru.
  - Test: e2e `bottom-nav.spec.ts` (TC-TKPDD-136–139) di viewport mobile.

### Fixed
- **`ChatFab` kini tampil di mobile.** Sebelumnya `hidden md:flex` — FAB yang hanya muncul di desktop, padahal justru mobile yang membutuhkannya (header menyembunyikan link chat di bawah `md`). Kini tampil di mobile dan diangkat di atas bottom nav agar tidak saling menutupi; disembunyikan di `/chat` sendiri dan di rute yang menyembunyikan nav.

### Notes
- Berkas aturan nav dinamai `bottomNavRules.ts`, **bukan** `bottomNav.ts`, karena beda kapitalisasi saja dengan `BottomNav.tsx` — di filesystem case-insensitive (Windows/macOS) resolusi modulnya bentrok dan hasilnya bisa berbeda dari CI Linux.

## [Unreleased] — M11-A8: Variant Kombinasi Multi-Axis (tahap 1–3)

### Added
- **Varian multi-axis** (`M11-A8`) — produk bisa punya sampai **3 opsi** (mis. Warna × Ukuran) dengan stok & selisih harga per kombinasi, maksimal **50 kombinasi**.
  - Schema: `ProductOption`, `ProductOptionValue`, `ProductVariantValue`, plus `ProductVariant.imageUrl` (migration `m11_a8_variant_options`, aditif murni).
  - Helper bersama `packages/shared/src/utils/variant.ts` (`cartesian`, `comboKey`, `availableValues`, `findVariant`) — dipakai API dan FE supaya aturannya hidup di satu tempat.
  - FE: `VariantPicker` (chip per sumbu, nilai tanpa kombinasi berstok otomatis nonaktif) dan `VariantMatrixEditor` di panel seller (definisi opsi → tabel kombinasi).
  - Script backfill idempoten: `npm run db:backfill-variants` (dukung `--dry-run`).
  - Test: 32 unit (`variant.test.ts`) + e2e TC-TKPDD-132–135.

### Changed
- `ProductVariant.name` **berubah peran** jadi cache turunan label kombinasi ("Merah / M") yang ditulis ulang tiap simpan. Kolomnya dipertahankan — snapshot `OrderItem.variantName` jadi tetap benar tanpa perubahan apa pun, dan produk yang belum di-backfill tetap punya label.
- Payload varian seller berganti bentuk: `{ options: [{name, values}], variants: [{values, priceModifier, stock}] }`. Kombinasi dirujuk lewat **nilai posisional**, bukan id, supaya create dan edit sebentuk.
- Seed menghasilkan struktur option/value dan menambah satu produk 2 sumbu (Baju Koko — Warna × Ukuran, kombinasi Navy/XL sengaja berstok 0).

### Fixed
- **Kombinasi varian yang dihapus seller tidak lagi menghilangkan varian di keranjang orang lain.** Perilaku lama meng-hard-delete `ProductVariant`; karena `CartItem.variantId` ber-FK `ON DELETE SET NULL`, item keranjang pembeli diam-diam berubah jadi "tanpa varian", dan `OrderItem.variantId` (kolom polos tanpa FK) menunjuk baris yang sudah lenyap. Sekarang kombinasi yang tidak lagi ditawarkan **dinonaktifkan**, id-nya dipertahankan.

### Notes
- **Tahap 4 (drop kolom `ProductVariant.name`) sengaja belum dikerjakan** — menunggu backfill diverifikasi di produksi. Sebelum itu `name` masih dipakai snapshot pesanan dan fallback FE.
- Produk lama yang **belum** di-backfill tetap tampil normal: FE jatuh ke mode 1 sumbu memakai `name`. Jadi jeda antara `migrate deploy` dan backfill tidak merusak halaman produk.

## [Unreleased] — M11-B4: Statistik Produk Detail

### Added
- **Statistik per produk** (`M11-B4`) — halaman `/seller/produk/[id]/statistik`: chart penonton unik per hari (7/30 hari), kartu metrik (penonton, pesanan, pendapatan, konversi), dan tabel pesanan terakhir yang memuat produk tersebut. Tanpa migration — semua dari data existing.
  - API: `GET /seller/products/:id/stats?range=7d|30d`. Produk milik toko lain dibalas **404** (bukan 403) supaya keberadaannya tidak bocor.
  - Helper agregasi murni di `product.stats.ts` (`dayKey`, `buildDayKeys`, `bucketByDay`, `conversionPct`) — 19 unit test, plus e2e `product-stats.spec.ts` (TC-TKPDD-129–131).
  - Komponen `DailyBarChart` — chart batang CSS tanpa library, dilengkapi tabel `sr-only` untuk pembaca layar.

### Notes
- **Batas data yang jujur**: `ProductView` di-upsert per (penonton, produk), jadi chart menggambarkan **penonton unik per hari** ("minat harian"), bukan jumlah pageview. Pageview kumulatif tetap ada di `Product.viewCount` dan ditampilkan terpisah. Metrik add-to-cart **tidak disediakan** — `CartItem` dihapus saat checkout sehingga tidak ada jejak historisnya, dan menampilkan angka tebakan lebih buruk daripada tidak menampilkannya.
- **Konversi bisa melebihi 100%** kalau pembelinya melihat produk sebelum rentang dimulai. Ditampilkan apa adanya dengan penjelasan di UI, tidak di-clamp. Bernilai `null` (tampil `—`) saat belum ada penonton — bukan 0%, yang keliru menyiratkan ada penonton yang tidak membeli.
- **Chart sengaja tanpa library**: 7–30 batang dari satu deret angka tidak sepadan dengan ~100 KB gzipped tambahan di panel seller. Pindah ke recharts kalau nanti butuh sumbu ganda, zoom, atau multi-seri.
- Kunci hari dibuat dari komponen tanggal **lokal**, bukan `toISOString()` yang mengonversi ke UTC dan menggeser batas hari. `seller.dashboard.routes` masih memakai pola lama itu — layak dirapikan terpisah.

## [Unreleased] — M11-B1: Etalase / Showcase Toko

### Added
- **Etalase Toko** (`M11-B1`) — seller mengelompokkan produk ke dalam etalase (mis. "Best Seller", "Diskon"); di halaman toko etalase tampil sebagai tab di samping "Semua Produk".
  - Schema: model `ShopShowcase` + tabel join `ShopShowcaseProduct` (migration `m11_b1_shop_showcase`). `@@unique([shopId, slug])` — slug unik per toko, bukan global, jadi dua toko boleh sama-sama punya `best-seller`. Satu produk boleh berada di lebih dari satu etalase.
  - API seller: `GET/POST/PUT/DELETE /seller/showcase`, `POST /seller/showcase/:id/products` (replace-all), `DELETE /seller/showcase/:id/products/:productId`, `POST /seller/showcase/:id/move`.
  - API publik: `GET /shops/:slug` kini menyertakan `showcases`; produk per etalase di `GET /shops/:slug/showcase/:showcaseSlug` (paginated, lewat `toProductCard` yang sama dengan listing lain sehingga harga sale M9-B3 ikut terhitung).
  - FE: halaman `/seller/etalase` (CRUD + picker produk dengan pencarian server-side + reorder ▲▼) dan tab etalase di `/toko/[slug]` + route `/toko/[slug]/etalase/[showcaseSlug]`. Header toko diekstrak jadi `ShopHeader` supaya kedua halaman tidak menyimpan salinan markup yang sama.
  - Test: unit `showcase.test.ts` (18 test — reorder + schema) dan e2e `showcase.spec.ts` (TC-TKPDD-125–128) yang menutup jalur ber-DB: kepemilikan produk, etalase kosong disembunyikan, slug stabil setelah rename.

### Changed
- `GET /api/v1/shops/:slug` menambah field `showcases` (array; kosong kalau toko belum punya etalase berisi). Aditif — konsumen lama tidak terpengaruh.

### Notes
- Batas: **10 etalase per toko**, **50 produk per etalase** — ditegakkan di zod dan UI.
- Etalase kosong (atau yang seluruh produknya nonaktif/habis stok) sengaja disembunyikan dari pembeli, tapi tetap terlihat di panel seller supaya bisa diisi.
- **Rename tidak mengubah slug.** URL etalase yang sudah dibagikan tetap hidup; konsekuensinya slug bisa tidak lagi cocok dengan nama barunya.
- Etalase dihapus **tidak** menghapus produknya — cascade hanya membersihkan baris join.

## [Unreleased] — M10-A7: Komplain / Return

### Added
- **Komplain / Return** (`M10-A7`) — setelah barang diterima, buyer punya **2 hari** untuk komplain per item pesanan dengan bukti foto, memilih penyelesaian **kembalikan dana** atau **ganti barang**. Alurnya buyer → seller → (kalau ditolak) admin.
  - Schema: model `Complaint` + enum `ComplaintType` / `ComplaintResolution` / `ComplaintStatus` (migration `m10_a7_complaint`). `@@unique([orderItemId])` — satu item sekali komplain, kelanjutannya lewat escalate.
  - API: `POST /orders/:id/complaints`, `POST /complaints/:id/seller-respond`, `POST /complaints/:id/escalate`, `GET /complaints`, `GET /seller/complaints`, `GET /admin/complaints`, `POST /admin/complaints/:id/decide`.
  - Sisi uang: helper baru `settleOrderRefund` (kembalikan stok, tarik saldo seller, set order REFUNDED) diekstrak dari route refund admin dan dipakai bersama — komplain yang berakhir REFUND memproses pengembalian dengan aturan saldo yang sama persis. Resolusi REPLACEMENT hanya mencatat keputusan + notifikasi.
  - FE: tombol "📦 Komplain Barang" di detail pesanan (muncul hanya saat DELIVERED/COMPLETED dan masih dalam jendela 2 hari) + `ComplaintModal`; halaman `/komplain` (buyer), `/seller/komplain`, `/admin/komplain` memakai kartu bersama `ComplaintCard`; item sidebar seller & admin, plus entri "Komplain Saya" di menu akun.
  - Test: `apps/api/src/modules/complaint/complaint.test.ts` — jendela waktu, aturan escalate, validasi schema.

### Changed
- Buyer juga bisa menaikkan komplain ke admin kalau seller **tidak menanggapi** dalam 2 hari — di luar rencana awal, tapi tanpa ini komplain bisa menggantung selamanya di status OPEN.

## [Unreleased] — M10-A10: Filter Search Lengkap

### Added
- **Sidebar filter di `/cari`** (`M10-A10`) — grup collapsible: harga (range + tombol terapkan), kondisi, rating minimum, lokasi (multi-kota + jumlah produk per kota), dan Official Store / Bebas Ongkir / Bisa COD. Seluruh state tersimpan di URL, jadi hasil filter bisa dibagikan; tombol "Reset Filter" muncul saat ada filter aktif.
  - Schema: `Product.codAvailable` (default **true**, supaya produk lama tidak kehilangan COD), `Product.freeShippingEligible`, `Shop.isOfficialStore` (migration `m10_a10_search_filters`).
  - API: `listProducts` menerima `cities` (comma-separated, semantik OR), `officialStoreOnly`, `freeShipping`, `cod`. Baru: `GET /api/v1/products/cities` untuk mengisi grup Lokasi, `POST /api/v1/admin/shops/:id/official-store` untuk toggle admin.
  - Seller: section "Opsi Pengiriman" di form produk (COD & bebas ongkir), ikut tersalin saat duplikasi produk.
  - Test: `apps/api/src/modules/product/product.test.ts` — parsing `cities`, filter boolean, rentang & default.

### Changed
- Filter rating & kondisi pindah dari SortBar ke sidebar — SortBar sekarang khusus sortir.
- Checkout menegakkan kedua flag baru, bukan sekadar menyaring pencarian: COD ditolak kalau ada item dengan `codAvailable=false` (radio COD juga ter-disable di FE dengan alasan yang jelas), dan ongkir jadi 0 hanya kalau seluruh item satu toko bebas ongkir.

## [Unreleased] — M10-A5: QRIS Mock UX (QR + countdown + expiry)

### Added
- **QRIS mock flow lengkap** (`M10-A5`) — checkout dengan QRIS tidak lagi auto-paid; buyer diarahkan ke halaman bayar berisi QR, nominal, dan hitung mundur 15 menit.
  - Schema: `OrderStatus` + nilai `EXPIRED` (migration `m10_a5_order_status_expired`, aditif). Dibedakan dari `CANCELLED` supaya kedaluwarsa otomatis tidak tercampur dengan pembatalan oleh pembeli/penjual.
  - API: `GET /api/v1/orders/:id/qris` (QR PNG data URI via `qrcode`, nominal, `expiresAt`, `expired`) dan `POST /api/v1/orders/:id/qris/simulate-paid` sebagai pengganti webhook PSP selama masih mock. `POST /orders/:id/pay` dipertahankan sebagai alias flow yang sama.
  - Expiry: batas waktu derived dari `createdAt + QRIS_EXPIRY_MINUTES` (tanpa kolom baru), ditegakkan lewat lazy-check saat baca detail/daftar pesanan & saat simulate-paid — stok dikembalikan lewat helper `restoreStock` yang kini dipakai bersama `cancelOrder`. Race dengan simulate-paid dijaga `updateMany ... where status = PENDING_PAYMENT`.
  - FE: komponen `QrisPanel` (QR + hitung mundur, merah saat < 3 menit, state kedaluwarsa), halaman bayar bercabang per metode bayar, tombol di detail pesanan jadi "Bayar dengan QRIS", checkout QRIS langsung menuju halaman bayar.
  - Test: `apps/api/src/modules/payment/payment.test.ts` — batas waktu & payload QR.

### Changed
- `POST /api/v1/orders/:id/pay` sekarang menghormati batas waktu 15 menit dan menolak order yang sudah kedaluwarsa (sebelumnya selalu langsung menandai PAID).

## [Unreleased] — M9-B3: Sale Price (Diskon Produk Periodik)

### Added
- **Sale Price / Diskon Periodik** (`M9-B3`) — produk punya harga coret + harga diskon dengan periode; menutup **M9** (A4 + B2 + C1 + B3 semua selesai).
  - Schema: `Product.salePrice Int?` + `saleStartAt`/`saleEndAt DateTime?` (migration `m9_b3_product_sale_price`).
  - Shared: helper `getEffectivePrice`/`isSaleActive`/`getDiscountPct`/`getSaleRemainingMs` di `utils/price.ts` — prioritas harga lintas-milestone (flash sale > sale price > grosir) terdokumentasi di sini.
  - API: response card produk (list/related/for-you/wishlist/baru-dilihat via `toProductCard`) kirim `price` **efektif** + `originalPrice`/`discountPct`/`saleEndAt` saat sale aktif; cart & checkout hitung pakai harga efektif → snapshot tersimpan di `OrderItem.price`; validasi seller (`salePrice < price`, periode wajib & konsisten, clear salePrice → clear periode).
  - FE: badge **-XX%** + harga coret di `ProductCard` & halaman detail; BuyBox pakai harga efektif + **countdown** saat sisa < 24 jam; seller `ProductForm` dapat section "🏷️ Diskon Periodik" (checkbox + harga + periode, preview persen).

### Changed
- Sort "termurah" tetap berdasarkan harga normal (kolom `price` DB) — mismatch kecil saat produk sedang sale, diterima untuk MVP.

## [Unreleased] — M9-C1: Voucher Platform Global

### Added
- **Voucher Platform** (`M9-C1`) — admin terbitkan voucher platform-wide (`shopId` null → berlaku semua toko, muncul di Voucher Picker semua user).
  - API: `GET/POST/PUT/DELETE /api/v1/admin/voucher` (guard ADMIN; `?scope=platform|shop|all`; edit/hapus hanya voucher platform — voucher toko milik seller). Reuse `voucherCreateSchema`/`voucherUpdateSchema` dari M9-B2.
  - FE: halaman `/admin/voucher` — 3 tab scope (Platform CRUD penuh, Voucher Toko read-only utk monitoring, Semua), form modal, pause/resume, badge 🌐/🏪 + item sidebar "Voucher".
  - Catatan: target scope kategori (`categoryId`, opsional di rencana) deferred.

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
