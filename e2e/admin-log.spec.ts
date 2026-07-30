// Jejak audit aksi admin (M12-C3).
//
// Yang tidak bisa diuji unit test dan justru paling penting di sini: aksi
// sungguhan benar-benar menghasilkan baris log, tabelnya append-only (tidak ada
// endpoint tulis), dan payload data-URI tidak bocor ke kolom `payload`.
//
// Suite ini membuat kategori baru sebagai sasaran aksi lalu menghapusnya —
// dipilih karena kategori paling murah dibuat/dihapus dan tidak menyentuh
// pesanan, saldo, atau akun seed yang dipakai spec lain.
import { test, expect } from '@playwright/test';
import { tc, V1, auth, tokenFor } from './helpers/testforge';

test.describe.configure({ mode: 'serial' });

// Nama unik per run supaya tidak tabrakan dengan sisa run sebelumnya.
const NAMA = `Uji Audit ${Date.now()}`;
let categoryId = '';

test(tc('149', 'Aksi admin menghasilkan entri log dengan pelaku & sasaran benar'), async ({ request }) => {
  const t = auth(tokenFor('admin'));

  const buat = await request.post(`${V1}/admin/categories`, {
    headers: t,
    data: { name: NAMA, order: 0, isActive: true },
  });
  expect(buat.status(), await buat.text()).toBe(201);
  categoryId = (await buat.json()).data.id;

  // logAdmin sengaja fire-and-forget (aksi utama tidak menunggu penulisan log),
  // jadi entri bisa muncul beberapa milidetik setelah respons. Ditunggu dengan
  // polling, bukan sleep tetap.
  await expect(async () => {
    const res = await request.get(`${V1}/admin/logs?action=CREATE_CATEGORY&targetId=${categoryId}`, {
      headers: t,
    });
    expect(res.status()).toBe(200);
    const { items } = (await res.json()).data;
    expect(items.length, 'entri CREATE_CATEGORY belum muncul').toBe(1);

    const row = items[0];
    expect(row.action).toBe('CREATE_CATEGORY');
    expect(row.targetType).toBe('CATEGORY');
    expect(row.targetId).toBe(categoryId);
    // Pelakunya harus admin yang benar-benar melakukan, bukan null.
    expect(row.admin?.fullName).toBeTruthy();
    expect(row.adminId).toBe(row.admin.id);
    // Payload menyimpan body-nya.
    expect(row.payload?.name).toBe(NAMA);
    expect(Number.isNaN(Date.parse(row.createdAt))).toBe(false);
  }).toPass({ timeout: 10_000 });
});

test(tc('150', 'Payload data-URI tidak pernah masuk kolom payload'), async ({ request }) => {
  const t = auth(tokenFor('admin'));
  // Bentuk nyata yang dikirim halaman admin/banner (FileReader.readAsDataURL).
  const dataUri = `data:image/png;base64,${'A'.repeat(50_000)}`;

  const buat = await request.post(`${V1}/admin/banners`, {
    headers: t,
    data: { imageUrl: dataUri, placement: 'HOME_TOP', order: 0, isActive: false },
  });
  expect(buat.status(), await buat.text()).toBe(201);
  const bannerId = (await buat.json()).data.id;

  try {
    await expect(async () => {
      const res = await request.get(`${V1}/admin/logs?action=CREATE_BANNER&targetId=${bannerId}`, {
        headers: t,
      });
      const { items } = (await res.json()).data;
      expect(items.length, 'entri CREATE_BANNER belum muncul').toBe(1);

      const teks = JSON.stringify(items[0].payload);
      // Inti test ini: base64-nya dibuang, bukan cuma dipotong sebagian.
      expect(teks).not.toContain('AAAAAAAAAA');
      expect(teks).toContain('data-URI');
      expect(teks.length, 'payload log harus tetap kecil').toBeLessThan(2_000);
    }).toPass({ timeout: 10_000 });
  } finally {
    // Banner uji dibersihkan; entri lognya sengaja dibiarkan — memang append-only.
    await request.delete(`${V1}/admin/banners/${bannerId}`, { headers: t });
  }
});

test(tc('151', 'Log append-only: tidak ada endpoint ubah maupun hapus'), async ({ request }) => {
  const t = auth(tokenFor('admin'));

  const res = await request.get(`${V1}/admin/logs?limit=1`, { headers: t });
  const id = (await res.json()).data.items[0]?.id;
  expect(id, 'butuh minimal satu entri dari test sebelumnya').toBeTruthy();

  // Semua metode tulis harus tidak terlayani. 404/405 sama-sama benar —
  // yang penting BUKAN 2xx: tidak ada jalan mengubah jejak audit lewat API.
  for (const [method, url] of [
    ['DELETE', `${V1}/admin/logs/${id}`],
    ['PATCH', `${V1}/admin/logs/${id}`],
    ['PUT', `${V1}/admin/logs/${id}`],
    ['POST', `${V1}/admin/logs`],
  ] as const) {
    const r = await request.fetch(url, { method, headers: t, data: {} });
    expect(r.status(), `${method} ${url} tidak boleh berhasil`).toBeGreaterThanOrEqual(400);
  }
});

test(tc('152', 'Viewer log butuh peran admin'), async ({ request }) => {
  for (const peran of ['buyer', 'seller'] as const) {
    const r = await request.get(`${V1}/admin/logs`, { headers: auth(tokenFor(peran)) });
    expect(r.status(), `${peran} tidak boleh bisa membaca jejak audit`).toBe(403);
  }
  const anon = await request.get(`${V1}/admin/logs`);
  expect(anon.status()).toBe(401);
});

test(tc('153', 'Filter aksi, sasaran & rentang tanggal bekerja + paginasi'), async ({ request }) => {
  const t = auth(tokenFor('admin'));

  // Filter aksi: semua hasil harus aksi itu saja.
  const perAksi = await request.get(`${V1}/admin/logs?action=CREATE_CATEGORY&limit=50`, { headers: t });
  const items = (await perAksi.json()).data.items;
  expect(items.length).toBeGreaterThan(0);
  for (const it of items) expect(it.action).toBe('CREATE_CATEGORY');

  // Filter jenis sasaran.
  const perSasaran = await request.get(`${V1}/admin/logs?targetType=CATEGORY&limit=50`, { headers: t });
  for (const it of (await perSasaran.json()).data.items) expect(it.targetType).toBe('CATEGORY');

  // `to` hari ini harus INKLUSIF — entri yang baru saja dibuat wajib ikut
  // terhitung. Kalau `to` dipakai apa adanya sebagai tengah malam awal hari,
  // seluruh isi hari terakhir hilang; itu bug yang paling gampang lolos.
  const hariIni = new Date().toISOString().slice(0, 10);
  const rentang = await request.get(
    `${V1}/admin/logs?action=CREATE_CATEGORY&from=${hariIni}&to=${hariIni}&limit=50`,
    { headers: t },
  );
  expect((await rentang.json()).data.total, 'entri hari ini harus masuk rentang from=to=hari ini')
    .toBeGreaterThan(0);

  // Rentang di masa lalu harus kosong.
  const lampau = await request.get(`${V1}/admin/logs?from=2020-01-01&to=2020-01-02`, { headers: t });
  expect((await lampau.json()).data.total).toBe(0);

  // Aksi yang tidak dikenal ditolak, bukan diabaikan diam-diam.
  const ngawur = await request.get(`${V1}/admin/logs?action=DROP_TABLE`, { headers: t });
  expect(ngawur.status()).toBe(400);

  // Paginasi: limit dihormati, dan total tidak berubah antar halaman.
  const h1 = await request.get(`${V1}/admin/logs?limit=1&page=1`, { headers: t });
  const d1 = (await h1.json()).data;
  expect(d1.items).toHaveLength(1);
  expect(d1.limit).toBe(1);
  if (d1.total > 1) {
    const h2 = await request.get(`${V1}/admin/logs?limit=1&page=2`, { headers: t });
    const d2 = (await h2.json()).data;
    expect(d2.total).toBe(d1.total);
    expect(d2.items[0].id, 'halaman 2 harus beda entri').not.toBe(d1.items[0].id);
  }

  // Urutan terbaru dulu.
  const urut = await request.get(`${V1}/admin/logs?limit=5`, { headers: t });
  const waktu = (await urut.json()).data.items.map((i: { createdAt: string }) => Date.parse(i.createdAt));
  for (let i = 1; i < waktu.length; i++) expect(waktu[i - 1]).toBeGreaterThanOrEqual(waktu[i]);
});

test(tc('154', 'Aksi hapus juga tercatat, dan entri pelaku tetap ada setelahnya'), async ({ request }) => {
  const t = auth(tokenFor('admin'));
  expect(categoryId, 'butuh kategori dari TC-149').toBeTruthy();

  const hapus = await request.delete(`${V1}/admin/categories/${categoryId}`, { headers: t });
  expect(hapus.status(), await hapus.text()).toBe(200);

  await expect(async () => {
    const res = await request.get(`${V1}/admin/logs?action=DELETE_CATEGORY&targetId=${categoryId}`, {
      headers: t,
    });
    const { items } = (await res.json()).data;
    expect(items.length, 'entri DELETE_CATEGORY belum muncul').toBe(1);
    expect(items[0].note).toBe(NAMA);
  }).toPass({ timeout: 10_000 });

  // Sasaran sudah lenyap dari DB, tapi jejaknya harus tetap terbaca —
  // itulah gunanya log ini.
  const masihAda = await request.get(`${V1}/admin/logs?targetId=${categoryId}`, { headers: t });
  expect((await masihAda.json()).data.total, 'CREATE + DELETE keduanya harus tetap tersimpan').toBe(2);

  // Daftar pelaku untuk dropdown filter terisi.
  const pelaku = await request.get(`${V1}/admin/logs/admins`, { headers: t });
  const daftar = (await pelaku.json()).data as { id: string; fullName: string; count: number }[];
  expect(daftar.length).toBeGreaterThan(0);
  expect(daftar[0].count).toBeGreaterThan(0);
});

test(tc('155', 'Halaman /admin/log merender entri & dropdown filter'), async ({ page, request }) => {
  // Panel admin dilindungi di sisi klien (`AdminShell` push ke /masuk kalau
  // store auth kosong), dan store-nya zustand/persist di localStorage. Token
  // hasil global-setup disuntikkan sebelum skrip halaman jalan — tanpa ini
  // halamannya cuma bisa diuji di level API dan viewer-nya tidak pernah dibuka.
  const token = tokenFor('admin');
  const me = await request.get(`${V1}/auth/me`, { headers: auth(token) });
  expect(me.status()).toBe(200);
  const user = (await me.json()).data;

  await page.addInitScript(
    ([u, t]) => {
      window.localStorage.setItem(
        'tokopudidi-auth',
        JSON.stringify({ state: { user: u, tokens: { accessToken: t, refreshToken: t } }, version: 0 }),
      );
    },
    [user, token] as const,
  );

  await page.goto('/admin/log');

  await expect(page.getByRole('heading', { name: /Jejak Audit Admin/ })).toBeVisible();
  // Tidak terlempar ke /masuk.
  expect(new URL(page.url()).pathname).toBe('/admin/log');

  // Dropdown aksi terisi dari ADMIN_ACTIONS (21 aksi + opsi "Semua aksi").
  const opsiAksi = page.locator('select').nth(1).locator('option');
  await expect(opsiAksi).toHaveCount(22);

  // Minimal satu entri tampil (dibuat TC-149/150) beserta nama pelakunya.
  await expect(page.getByText(user.fullName).first()).toBeVisible();

  // Entri berpayload bisa dibuka.
  const tombolPayload = page.getByRole('button', { name: 'Lihat payload' }).first();
  await expect(tombolPayload).toBeVisible();
  await tombolPayload.click();
  await expect(page.locator('pre').first()).toBeVisible();

  // Nav punya entri Jejak Audit.
  await expect(page.getByRole('link', { name: /Jejak Audit/ }).first()).toBeVisible();
});
