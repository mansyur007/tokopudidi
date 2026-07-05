# 🧪 Tokopudidi — Rencana Testing Automation

> **Status dokumen**: Draft 1 · Dibuat **2026-07-05**
> **Tujuan**: peta jalan membangun test automation dari kondisi sekarang (coverage ~0% logika bisnis) menuju safety net yang layak untuk marketplace. Setiap fase punya **ID** yang bisa di-klaim per orang/tim, sama seperti [ROADMAP.md](ROADMAP.md).

## Cara baca dokumen ini

- Tiap item punya **ID** (mis. `T1`) — pakai di nama branch (`test/T1-ci-gate`), commit (`test(T1): ...`), dan PR.
- Status legend sama dengan ROADMAP: 🔵 `TODO` · 🟡 `IN PROGRESS` · 🟢 `DONE` · ⚪ `BLOCKED` · 🔴 `DROPPED`.
- Update Status & Owner di sini saat ambil/selesai pekerjaan.

---

## 📍 Kondisi sekarang (baseline)

| Aspek | Status |
|---|---|
| Runner unit | ✅ **Vitest** di `apps/api` ([vitest.config.ts](apps/api/vitest.config.ts), pola `src/**/*.test.ts`) |
| Test yang ada | ⚠️ **1 file** — [auth.test.ts](apps/api/src/modules/auth/auth.test.ts), 7 test (hanya `normalizePhone` + Zod schema) |
| CI | ✅ [ci.yml](.github/workflows/ci.yml) — `npm ci` → `prisma generate` → build db+shared → lint → test → build web |
| Smoke test deploy | ✅ [deploy.yml](.github/workflows/deploy.yml) — cek `/api/health` + homepage pasca-deploy |
| E2E | ❌ belum ada (tapi **Playwright sudah jadi dependency** dari fitur scraper) |
| Test frontend | ❌ belum ada sama sekali |
| Test integrasi API/DB | ❌ belum ada |
| Lint API | ❌ **palsu** — script `echo 'lint OK'` (tidak men-lint apa pun) |
| Gate `tsc` | ❌ tidak ada di CI (utang teknis, lihat ROADMAP `OPS-9`) |

**Kesimpulan**: fondasi automation ada (Vitest + CI + smoke test), tapi coverage logika inti nyaris nol. Satu-satunya pengaman regresi saat ini praktis hanya "masih bisa build?".

---

## 🎯 Prinsip & strategi

1. **Testing pyramid, bukan es krim kon.** Banyak unit test (cepat, murah) → integrasi secukupnya (endpoint kritis) → E2E sedikit (golden path saja). Hindari menumpuk E2E untuk hal yang bisa diuji di level lebih bawah.
2. **Satu runner: Vitest.** Dipakai untuk unit (api + shared) *dan* komponen frontend (via jsdom). Jangan tambah Jest — hanya menduplikasi.
3. **Test DB pakai Postgres asli, bukan mock Prisma.** Logika bergantung constraint nyata (unique, cascade, transaksi, search vector via raw SQL). Mock Prisma rapuh & menipu.
4. **Jangan pernah hit layanan eksternal di test.** Scraper Tokopedia diuji dengan **fixture HTML**, bukan jaringan nyata. Fetch FE di-mock dengan MSW.
5. **Deterministik & terisolasi.** Tiap test bersih dari sisa test lain (reset DB per file/suite). Tidak ada urutan test yang saling bergantung.
6. **Test menyertai fitur.** Mulai fase ini, PR fitur baru **wajib** menyertakan test untuk jalur utamanya (lihat Definition of Done di bawah).

---

## 🧰 Tooling final (keputusan)

| Lapisan | Tool | Catatan |
|---|---|---|
| Unit (logic murni) | **Vitest** | Sudah ada. Perluas ke `packages/shared`. |
| Integrasi API (HTTP) | **Vitest + Supertest** | Uji Express app via `createApp()` tanpa listen port. |
| Test DB | **Postgres asli** — **Testcontainers** (`@testcontainers/postgresql`) *atau* DB `tokopudidi_test` terpisah | Reset antar-suite: `TRUNCATE ... RESTART IDENTITY CASCADE`. |
| Komponen frontend | **Vitest + React Testing Library + jsdom** | Satu runner, konsisten. |
| Mock HTTP (FE + eksternal) | **MSW** (Mock Service Worker) | Juga untuk unit-test parser scraper dengan fixture. |
| E2E | **Playwright** | Sudah jadi dependency. Golden path saja. |
| Gate statis | **ESLint** (asli) + **`tsc --noEmit`** | Ganti lint palsu API; jadikan gate CI. |
| Coverage | **Vitest `--coverage` (v8)** | Bawaan, tanpa tool tambahan. |

**Ditolak**: Jest (duplikasi Vitest), Cypress (Playwright cukup), `prisma-mock` (rapuh).

---

## 📁 Struktur & konvensi

```
apps/api/
  src/modules/<mod>/<mod>.test.ts        # unit (colocated, existing pattern)
  test/
    integration/<mod>.int.test.ts        # integrasi HTTP+DB (Supertest)
    helpers/db.ts                        # setup Testcontainers / reset
    helpers/factory.ts                   # factory data (user, shop, product…)
    fixtures/                            # fixture HTML scraper, dsb.
apps/web/
  src/**/<Name>.test.tsx                 # komponen (RTL + jsdom)
  vitest.config.ts                       # config web (jsdom environment)
e2e/                                     # Playwright specs (root)
  playwright.config.ts
  golden-path.spec.ts
```

**Penamaan**: `*.test.ts(x)` = unit/komponen · `*.int.test.ts` = integrasi (butuh DB) · `*.spec.ts` = E2E Playwright. Pisahkan `include`/`project` di config supaya integrasi (lambat, butuh DB) tidak jalan di run unit cepat.

---

## 🗺️ Fase & item (bisa di-klaim)

### T1. Gate statis nyata (ESLint + tsc) 🚦
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Ganti lint palsu `apps/api` (`echo 'lint OK'`) dengan **ESLint** asli (TS + import order), samakan config dengan `apps/web`. Tambahkan `typecheck` script (`tsc --noEmit`) di api & web, jadikan **step CI** baru.
- **Deliver**:
  - `apps/api/.eslintrc.cjs` + `apps/api` `lint` = `eslint src --ext .ts`
  - `typecheck` script di `apps/api` & `apps/web` (web boleh mulai non-blocking bila utang tipe masih ada — lihat `OPS-9`)
  - [ci.yml](.github/workflows/ci.yml): tambah job/step `typecheck`
- **Acceptance**:
  - [ ] `npm run lint` benar-benar men-lint API (bukan echo)
  - [ ] `npm run typecheck` gagal kalau ada type error
  - [ ] CI menjalankan keduanya di tiap PR
- **Effort**: S · **ROI**: tertinggi (menutup celah "lint palsu" + regresi tipe yang selama ini dicek manual)

---

### T2. Infrastruktur test DB + factory 🏗️
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_ · **Blok untuk**: T3, T4
- **Scope**: Fondasi test integrasi: spin Postgres untuk test, terapkan migrasi, helper reset & factory data.
- **Deliver**:
  - `@testcontainers/postgresql` (opsi utama) — spin Postgres ephemeral per run; fallback: DB `tokopudidi_test` via env `DATABASE_URL_TEST`.
  - `test/helpers/db.ts` — `setupTestDb()` (jalankan `prisma migrate deploy` ke DB test), `resetDb()` (`TRUNCATE ... RESTART IDENTITY CASCADE` semua tabel).
  - `test/helpers/factory.ts` — `makeUser()`, `makeShop()`, `makeProduct()`, `makeOrder()` (Prisma create dengan default masuk akal + override).
  - `vitest.config.ts` split project: `unit` (cepat) vs `integration` (butuh DB, `globalSetup`).
- **Acceptance**:
  - [ ] `npm run test:int` menyalakan DB, migrasi jalan, satu test sanity (create user → read) hijau
  - [ ] `resetDb()` membersihkan state antar-file, test tidak saling bocor
  - [ ] Run unit biasa (`npm test`) **tidak** butuh DB
- **Effort**: M

---

### T3. Integrasi API — jalur kritis 🔗
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_ · **Butuh**: T2
- **Scope**: Test HTTP nyata (Supertest terhadap `createApp()`) untuk alur paling berisiko. Prioritas:
  1. **Auth**: register → login → refresh → akses route terproteksi (401 tanpa token).
  2. **Checkout & Order**: cart → checkout (1-order-per-toko, split multi-toko, validasi stok, potong stok transaksional) → bayar (mock) → transisi status.
  3. **Diskusi (M8-A3)**: tanya (login), balas (badge penjual auto), helpful toggle idempoten, soft delete + otorisasi (pemilik/admin/penjual).
  4. **Wishlist / Recently Viewed (M7)**: toggle, guest via cookie, dedup.
- **Deliver**: `test/integration/{auth,checkout,discussion,wishlist}.int.test.ts`
- **Acceptance**:
  - [ ] Tiap suite pakai factory + `resetDb()` di `beforeEach`
  - [ ] Cakup happy path + minimal 1 edge/error per endpoint (mis. checkout stok habis → 400, stok tak berkurang)
  - [ ] Assertion terhadap DB, bukan cuma status code (mis. stok benar-benar turun)
- **Effort**: L (bertahap per alur — boleh dipecah jadi T3a/T3b/…)

---

### T4. Unit test logika murni & service 🧩
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Fungsi tanpa I/O yang gampang salah & bernilai tinggi:
  - `packages/shared`: `formatRupiah`, `timeAgo`, `slugify`, helper harga (kalau/ketika `getEffectivePrice`/`getUnitPrice` ada — lihat ROADMAP M9-B3/M13-B1).
  - Scraper: parser **JSON-LD → ScrapedProduct** diuji dengan **fixture HTML** (`test/fixtures/tokopedia-*.html`), termasuk kasus JSON-LD hilang → fallback meta, dan halaman blokir.
  - Ongkir per zona, pembagian diskon proporsional multi-toko di checkout (ekstrak jadi fungsi murni bila masih inline).
- **Acceptance**:
  - [ ] Parser scraper diuji tanpa jaringan (fixture)
  - [ ] Helper shared punya test edge (0, negatif, batas)
- **Effort**: M

---

### T5. Komponen frontend (RTL) ⚛️
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_
- **Scope**: Komponen interaktif berisiko, di-render dengan RTL + jsdom, API di-mock via **MSW**:
  - `DiscussionThread` — render list, submit pertanyaan (login-gated), optimistic helpful.
  - `SearchBar` — debounce, dropdown 3 section, ESC/blur menutup.
  - `BuyBox` — qty guard, tombol nonaktif saat toko tutup/stok habis.
  - `store/wishlist.ts` — optimistic toggle + rollback saat gagal.
- **Deliver**: `apps/web/vitest.config.ts` (environment `jsdom`, setup RTL) + `*.test.tsx`.
- **Acceptance**:
  - [ ] Test render tanpa memanggil API nyata (MSW handler)
  - [ ] Interaksi (klik/ketik) diverifikasi lewat perubahan DOM, bukan implementasi internal
- **Effort**: M

---

### T6. E2E golden path (Playwright) 🎭
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_ · **Butuh**: stack lokal (compose) bisa naik di CI
- **Scope**: Sedikit skenario end-to-end di browser nyata terhadap stack lengkap (Postgres+API+Web via compose, DB di-seed):
  - **Golden path buyer**: buka beranda → cari produk → buka detail → tambah ke keranjang → checkout → order dibuat.
  - **Auth-gated**: klik wishlist saat logout → diarahkan ke `/masuk`.
  - **Diskusi**: login → buka tab Diskusi → kirim pertanyaan → muncul di list.
- **Deliver**: `e2e/playwright.config.ts` + spec; job CI terpisah (opsional: hanya di label/nightly agar CI utama tetap cepat).
- **Acceptance**:
  - [ ] Golden path hijau terhadap stack yang di-seed
  - [ ] Jalan headless di CI, artефакт (trace/screenshot) diunggah saat gagal
- **Effort**: L

---

### T7. Coverage & pelaporan 📊
- **Status**: 🔵 TODO · **Owner**: _belum di-klaim_ · **Butuh**: T3/T4 sudah ada isinya
- **Scope**: Aktifkan `--coverage` (v8), tetapkan **threshold bertahap** (mulai realistis, mis. 40% lines di `apps/api`, naikkan tiap milestone). Tampilkan ringkasan di CI.
- **Acceptance**:
  - [ ] `npm run test -- --coverage` menghasilkan laporan
  - [ ] Threshold gagalkan CI kalau turun di bawah ambang
- **Effort**: S

---

## 🔁 Integrasi CI (target akhir)

Urutan job di [ci.yml](.github/workflows/ci.yml) setelah rencana ini selesai:

```
install → prisma generate → build (db, shared)
  ├─ lint (ESLint asli)                    [T1]
  ├─ typecheck (tsc --noEmit)              [T1]
  ├─ test:unit (Vitest, cepat, no DB)      [T4, T5]
  ├─ test:int  (Vitest + Postgres service) [T2, T3]  ← service container postgres:15
  └─ build web (mirror produksi)
e2e (job terpisah / nightly)               [T6]
```

- Tambah **service container Postgres** di job integrasi (`services: postgres:15`), atau Testcontainers bila runner mengizinkan Docker-in-Docker.
- E2E dipisah agar CI PR tetap cepat; jalankan on-demand (label PR) atau terjadwal.

---

## ✅ Definition of Done (mulai berlaku setelah T1–T2)

PR fitur baru dianggap selesai bila:
- [ ] `lint` + `typecheck` hijau (T1)
- [ ] Ada **unit test** untuk logika non-trivial yang ditambah
- [ ] Ada **integrasi test** untuk endpoint baru (happy path + ≥1 edge) bila fitur menyentuh API/DB
- [ ] (Bila komponen interaktif) minimal 1 test RTL untuk perilaku utamanya
- [ ] Migrasi (bila ada) diuji naik bersih di DB test

---

## 🗓️ Urutan disarankan

| Fase | Item | Alasan urutan |
|---|---|---|
| **1** | T1 | Gate statis dulu — cepat, ROI tertinggi, langsung menutup lint palsu |
| **2** | T2 | Fondasi DB test — prasyarat semua integrasi |
| **3** | T3 (bertahap) + T4 | Isi safety net terhadap logika bisnis inti |
| **4** | T5 | Komponen FE berisiko |
| **5** | T6 | Golden path E2E setelah lapisan bawah stabil |
| **6** | T7 | Coverage gate setelah ada isi untuk diukur |

---

## 📚 Lampiran

- Runner & config existing: [apps/api/vitest.config.ts](apps/api/vitest.config.ts)
- Contoh test existing: [apps/api/src/modules/auth/auth.test.ts](apps/api/src/modules/auth/auth.test.ts)
- CI: [.github/workflows/ci.yml](.github/workflows/ci.yml) · Deploy smoke test: [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
- Roadmap fitur: [ROADMAP.md](ROADMAP.md) (lihat `OPS-9` untuk mengembalikan gate `tsc` produksi)
