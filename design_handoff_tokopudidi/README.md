# Handoff: Tokopudidi Marketplace — Revamp Tampilan

## Overview
Paket ini berisi desain referensi untuk **revamp tampilan marketplace** (homepage + halaman detail produk), bergaya e-commerce serba-ada (mirip pola Tokopedia, tapi brand original "Tokopudidi"). Tujuannya: menyegarkan UI website yang sudah ada agar bersih, ramah, dan modern dengan aksen hijau.

## About the Design Files
File HTML/JSX di bundle ini adalah **referensi desain** — prototipe yang menunjukkan tampilan & perilaku yang diinginkan, **bukan kode produksi untuk di-copy langsung**. Tugasnya adalah **merekreasi desain ini di environment codebase Anda yang sudah ada** (React/Next, Vue, Laravel Blade, dll.) memakai pola & library yang sudah dipakai di proyek Anda. Prototipe dibangun dengan React + Babel inline murni untuk keperluan demo — jangan tiru struktur loadingnya; ambil **layout, token desain, dan spesifikasi komponennya** saja.

> Penting: Saya tidak meniru brand/aset berhak cipta milik perusahaan lain. Logo, wordmark, warna, dan copy di sini original ("Tokopudidi"). Saat diterapkan, gunakan brand & aset milik Anda sendiri.

## Fidelity
**High-fidelity (hifi)** — warna, tipografi, spacing, dan interaksi sudah final. Rekreasi UI sepersis mungkin memakai komponen/design system codebase Anda. Gambar produk memakai placeholder bergaya (kotak bergaris + label monospace); ganti dengan foto/aset asli.

---

## Design Tokens

### Warna
| Token | Hex | Pemakaian |
|---|---|---|
| `--green` (primary) | `#1FA463` | tombol utama, harga aksen, link, badge official, tab aktif |
| `--green-tint` | `#e8f5ee` | background lembut (hover tombol outline, ikon centang) |
| `--red` | `#e5484d` | badge diskon (%), notifikasi cart/bell |
| `--red-tint` | `#fdecec` | background badge diskon pada harga |
| `--line` | `#ededed` | border kartu & garis pemisah |
| `--line-dark` | `#d4d7da` | border input, divider lebih tegas |
| `--muted` | `#8a8f96` | teks sekunder (lokasi, harga coret, label) |
| `--page-bg` | `#f3f4f5` | background halaman |
| teks utama | `#2e3137` | judul & body |
| teks body alt | `#3a3e45` | paragraf deskripsi/ulasan |
| bintang rating | `#ffb700` | ikon star |

### Tipografi
- **Font family**: `Plus Jakarta Sans` (Google Fonts, weights 400/500/600/700/800), fallback `system-ui, sans-serif`.
- **Monospace** (label placeholder gambar): `ui-monospace, SFMono-Regular, Menlo, monospace`, 10px, warna `rgba(40,44,52,0.42)`.

Skala teks yang dipakai:
| Elemen | Size / Weight |
|---|---|
| Wordmark logo | 21px / 800 |
| Judul section ("Kategori Populer") | 19px / 800 |
| Judul produk (detail H1) | 21px / 700, line-height 1.3 |
| Harga besar (detail) | 28px / 800 |
| Harga kartu | 15.5px / 800 (bold variant 17px) |
| Nama produk kartu | 13px / 500, line-height 1.35, clamp 2 baris |
| Body / spec | 13.5px / 400, line-height 1.5–1.7 |
| Label kecil / lokasi | 11–12px / 400–600 |
| Banner headline | 44px / 800 |

### Spacing & bentuk
- Lebar konten maksimum (`.wrap`): **1208px**, padding kiri/kanan 24px, center.
- Border radius default kartu/kotak: **12px** (`--radius`, bisa 0–20px). Chip kategori: 22px (pill). Tombol: 8–10px. Input: 9–10px.
- Gap grid feed produk: **12px**.
- Shadow hover kartu: `0 6px 20px rgba(0,0,0,0.10)` + `translateY(-2px)`.
- Shadow FAB/toast: `0 4px 16px rgba(0,0,0,0.14)` / `0 8px 28px rgba(0,0,0,0.3)`.

---

## Screens / Views

### 1. Header (sticky, di semua halaman)
**Purpose**: navigasi global, pencarian, akses cart/notif/chat, profil, lokasi pengiriman.
**Layout** (3 strip vertikal, `position: sticky; top: 0; z-index: 40; background: #fff`):
1. **Top utility strip** (tinggi 30px, border-bottom): kiri = teks promo "Gratis Ongkir + Banyak Promo…" dengan dot hijau; kanan = nav teks ("Tentang", "Pusat Edukasi Seller", "Promo", "Care") 11.5px muted.
2. **Main bar** (tinggi 62px, flex, gap 18px): `[Logo] [tombol Kategori] [search box flex-1] [ikon cart/bell/chat] [divider] [avatar + nama user]`.
   - **Logo**: kotak rounded 30×30 radius 9 background hijau berisi bentuk daun putih (rotate 45°, `border-radius: 50% 50% 50% 2px`), + wordmark "toko" (`#2e3137`) + "pudidi" (hijau), 21px/800.
   - **Search box**: flex-1, tinggi 42px, border 1.5px `--line` radius 10px, ikon search + input "Cari di Tokopudidi"; border jadi hijau saat focus-within.
   - **Ikon aksi**: tombol 38px square, badge merah bulat (cart=jumlah item, bell=3, chat=5) di pojok kanan atas.
   - **Profil**: avatar bulat 30px + 2 baris (nama toko muted 11px / username 13px bold).
3. **Location bar**: rata kanan, tombol teks "Dikirim ke **BSB Village Dayat**" dengan ikon pin hijau + chevron-down.

### 2. Homepage
Urutan section di dalam `.wrap`:

**a. Banner carousel** (tinggi 200px, radius 14px, overflow hidden)
- Background warna solid per slide + radial-gradient aksen di kanan; slot gambar placeholder di 42% kanan (opacity 0.5).
- Konten kiri (padding-left 40px, teks putih): pill kicker (bg `rgba(255,255,255,0.15)`, dot aksen) → subtitle 22px/600 → headline besar 44px/800 → tombol "Lihat Promo Lainnya".
- Panah prev/next bulat 34px (bg putih 0.9) di tengah vertikal; dots di kiri bawah (aktif = lebar 18px).
- Auto-rotate tiap **5 detik**. 3 slide.

**b. Hero card** (flex, 2 kolom, bg putih, border, radius 12px, padding 22×26)
- **Kiri (~56%, border-right)**: judul "Kategori Populer" 19px/800 → banner hijau gradient (`linear-gradient(100deg, #1FA463, #18935a)`, min-height 112px, radius 12) berisi teks ajakan + tombol putih "Cek Sekarang" + placeholder ilustrasi kanan → baris **chip kategori** (pill: ikon hijau + label, border `--line`, hover border+teks hijau).
- **Kanan (~44%, padding-left 28px)**: judul "Top Up & Tagihan" + link "Lihat Semua" → tab (Pulsa/Paket Data/Listrik PLN/Roaming, underline hijau saat aktif) → label "Nomor Telepon" → input nomor + select "Pilih Nominal" → tombol hijau full-width "Beli".

**c. Product feed**
- Tab: "For You" / "Mall" (dengan badge "MALL" hijau) / "Produk Incaranmu" — underline tebal 3px hijau saat aktif.
- **Grid 6 kolom** (gap 12px). Responsive: 4 kolom ≤1100px, 2 kolom ≤720px.
- Tombol "Muat Lebih Banyak" (outline hijau) menambah 12 kartu.

### 3. Product Card (3 varian — lihat bagian Komponen)
### 4. Halaman Detail Produk
**Layout**: breadcrumb → grid 3 kolom (`340px | 1fr | 280px`, gap 28, di dalam kartu putih radius 12 padding 22; jadi 1 kolom ≤1080px).
- **Kolom 1 — Gallery**: kolom thumbnail vertikal (5 × 50px, border hijau saat aktif, ganti saat hover/klik) + gambar utama besar (aspect 1:1, radius 12).
- **Kolom 2 — Info**: badge "Official Store" (hijau, ikon shield) → H1 nama 21px/700 → baris "Terjual … • ★ rating • (26 rating)" → harga 28px/800 + badge diskon (`--red-tint`/`--red`) + harga coret → **tab Detail/Spesifikasi/Info Penting** (konten: tabel key-value pakai grid `110px 1fr`) + "Lihat Selengkapnya" → **kartu toko** (avatar, nama + centang verified, rating, tombol Follow outline) → **kartu pengiriman** (ikon pin + lokasi, ikon truck + estimasi & bebas ongkir).
- **Kolom 3 — Buy box** (`position: sticky; top: 150px`, border radius 12 padding 16): "Atur jumlah dan catatan" → stepper qty (− [n] +) + "Stok Total 88" → baris Subtotal (live = harga×qty) → tombol hijau "+ Keranjang" → tombol outline "Beli Langsung" → baris Chat / Wishlist / Share.

**Bagian Ulasan Pembeli**:
- Kartu breakdown: ★ besar + "4.9 / 5.0", "96% pembeli merasa puas", "26 rating • 14 ulasan" + bar distribusi 5→1 bintang (fill hijau).
- 2 kolom: **sidebar filter** (200px: Media / Rating / Topik Ulasan, checkbox custom radius 4 centang hijau) + **daftar ulasan** (galeri foto pembeli 64px dengan overlay "+3" di item terakhir → header "Ulasan Pilihan · Menampilkan 10 dari 14" + dropdown "Urutkan: Paling Membantu" → list item ulasan → pagination 1/2/3 + link "Lihat Semua Ulasan").
- **Item ulasan**: baris bintang + tanggal + menu (•••) → avatar + nama → teks → foto (jika ada) → "Membantu / N orang terbantu" + "Lihat Balasan".

**Baris produk terkait**: "Lainnya di toko ini" & "Pilihan lainnya untukmu" — judul 18px/800 + "Lihat Semua", grid kartu sama seperti feed.

### 5. Footer
Bg putih, border-top. `.wrap` grid 5 kolom (`1.4fr 1fr 1fr 1.6fr` + kolom app): kolom link (Tokopudidi / Beli / Jual / Bantuan) + kolom "Nikmati keuntungan spesial di aplikasi" (list centang + QR placeholder + badge Google Play/App Store). Strip bawah: copyright kiri + toggle bahasa Indonesia/English kanan.

### 6. Elemen floating
- **Chat FAB**: kanan bawah fixed, pill putih + ikon chat hijau + teks "Chat".
- **Toast**: muncul bawah-tengah saat add-to-cart, bg `#2e3137`, ikon centang hijau + pesan, auto-hilang 2.2 detik (animasi slide-up 0.25s).

---

## Komponen — Product Card (3 varian via toggle)

Struktur dasar: kartu putih border radius 12, gambar aspect 1:1 di atas (placeholder), body padding ~10px. Hover: shadow + naik 2px. Tombol **quick-add** (+) muncul kanan-bawah gambar saat hover.

- **classic** (default): badge diskon merah + badge "MALL" kiri-atas gambar; body = "Official Store" (shield) → nama (2 baris clamp) → harga bold 15.5px → harga coret → pill "Bebas Ongkir" (border oranye) → ★ rating • terjual → centang verified + lokasi.
- **minimal**: tanpa badge & tanpa pill, lebih bersih — hanya nama, harga, rating, lokasi.
- **bold**: harga ditonjolkan hijau 17px + badge diskon kecil + harga coret di bawahnya; sisanya seperti classic.

---

## Interactions & Behavior
- **Klik kartu produk** → buka halaman detail produk (scroll ke atas). Klik logo / breadcrumb "Home" → kembali ke homepage.
- **Quick-add (+) di kartu** dan **"+ Keranjang" di detail** → tambah item, badge cart bertambah, tampil toast konfirmasi (`stopPropagation` pada quick-add agar tidak ikut membuka detail).
- **Stepper qty** di buy box → min 1, subtotal update live (harga × qty).
- **Tab** (feed, top-up, detail info) → ganti konten, underline pindah ke tab aktif.
- **Banner carousel** → auto-rotate 5s, panah & dots manual.
- **Gallery thumbnail** → ganti gambar utama saat hover/klik (border hijau penanda aktif).
- **Search input & filter ulasan** → controlled input (belum filter data nyata; titik integrasi ke API Anda).
- **Hover**: kartu naik+shadow, chip kategori → hijau, ikon header → bg abu, tombol outline → tint hijau.

## State Management
- `route`: `{ name: 'home' }` atau `{ name: 'detail', product }` — routing tampilan.
- `cart` (number): jumlah item; badge header.
- `query` (string): isi search.
- `toast` (string): pesan konfirmasi sementara (timer 2.2s).
- Per-komponen: `qty` (buy box), `tab` aktif (feed/top-up/info/gallery), index banner, `count` feed.
- **Titik integrasi data**: produk, kategori, banner, ulasan saat ini statis (`app/data.jsx`). Ganti dengan fetch dari API Anda; bentuk objek produk: `{ id, name, price, oldPrice, discount, rating, sold, store, location, category, official, freeOngkir, mall }`.

## Assets
- **Tidak ada gambar bitmap** — semua imagery memakai komponen `Placeholder` (kotak bergaris diagonal + label monospace). Ganti dengan `<img>`/CDN aset Anda.
- **Ikon**: SVG stroke inline sederhana (`Icon` di `app/placeholder.jsx`): search, cart, bell, chat, pin, chevron, star, heart, share, plus, minus, truck, shield, store, menu, check, flag, dots. Bebas ganti dengan icon set codebase Anda (mis. lucide/heroicons).
- **Font**: Plus Jakarta Sans via Google Fonts.

## Files (referensi di bundle ini)
- `Tokopudidi.html` — entry: CSS global (semua token & class) + urutan komponen.
- `app/placeholder.jsx` — komponen `Placeholder` + set `Icon`.
- `app/data.jsx` — data dummy (produk, kategori, banner, tab) + `fmtRp` (format Rupiah).
- `app/header.jsx` — Header, Logo, IconBtn.
- `app/card.jsx` — ProductCard (3 varian), StarRating, DiscountBadge.
- `app/home.jsx` — BannerCarousel, HeroCard, ProductFeed, HomeView.
- `app/detail.jsx` — DetailView (gallery, buy box, ulasan, related).
- `app/footer.jsx` — Footer, ChatFab, Toast.
- `app/main.jsx` — App root (routing, cart, toast, panel Tweaks).
- `tweaks-panel.jsx` — panel pengaturan demo (boleh diabaikan saat implementasi).

## Catatan implementasi
- Semua warna/spacing sudah jadi CSS custom properties di `:root` (`Tokopudidi.html`) — paling cepat: pindahkan token tsb ke design-system/Tailwind config Anda.
- Layout pakai flex/grid + `gap` (bukan margin antar elemen) — mudah dipindah ke komponen.
- Jaga ukuran minimum: teks ≥ 12px, hit target tombol ≥ 40px, kontras teks pada bg hijau cukup (teks putih).
