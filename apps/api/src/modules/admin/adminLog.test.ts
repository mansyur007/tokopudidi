// Unit test jejak audit admin (M12-C3). Logika murni + satu penjaga struktural
// yang memastikan tiap aksi terdaftar benar-benar dipanggil di route.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  ADMIN_ACTIONS,
  ADMIN_ACTION_LABEL,
  ADMIN_TARGET_TYPES,
  adminLogQuerySchema,
  redactAdminPayload,
  PAYLOAD_MAX_STRING,
} from '@tokopudidi/shared';

// Bentuk nyata yang tersimpan di Banner.imageUrl (admin/banner pakai readAsDataURL).
const DATA_URI = `data:image/png;base64,${'A'.repeat(2000)}`;

describe('ADMIN_ACTIONS', () => {
  it('tidak ada duplikat', () => {
    expect(new Set(ADMIN_ACTIONS).size).toBe(ADMIN_ACTIONS.length);
  });

  it('tiap aksi punya label bahasa Indonesia', () => {
    for (const a of ADMIN_ACTIONS) {
      expect(ADMIN_ACTION_LABEL[a], `label ${a} kosong`).toBeTruthy();
    }
  });

  it('tidak ada label nyasar untuk aksi yang tidak ada', () => {
    expect(Object.keys(ADMIN_ACTION_LABEL).sort()).toEqual([...ADMIN_ACTIONS].sort());
  });

  it('penamaannya SCREAMING_SNAKE_CASE', () => {
    for (const a of ADMIN_ACTIONS) expect(a).toMatch(/^[A-Z][A-Z_]*$/);
  });
});

// Acceptance "semua aksi di inventaris tercatat" gampang membusuk kalau cuma
// dicentang manual di PR. Test ini menegakkannya: aksi yang terdaftar tapi tidak
// pernah dipanggil `logAdmin` akan menggagalkan build.
describe('setiap aksi terdaftar benar-benar dipasang di route', () => {
  const modulesDir = join(__dirname, '..');

  function semuaSumber(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...semuaSumber(p));
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) out.push(p);
    }
    return out;
  }

  const sumber = semuaSumber(modulesDir).map((p) => readFileSync(p, 'utf8')).join('\n');

  it.each(ADMIN_ACTIONS)('%s dipanggil di suatu route', (action) => {
    expect(sumber).toContain(`logAdmin(req.user!.sub, '${action}'`);
  });
});

describe('redactAdminPayload', () => {
  // Inti helper ini: bannerCreateSchema.imageUrl hanya z.string().min(5), dan
  // admin/banner mengunggah lewat readAsDataURL. Tanpa redaksi, satu banner
  // menaruh base64 megabyte-an di tabel audit.
  it('data-URI dibuang, diganti penanda mime + ukuran', () => {
    const out = redactAdminPayload({ imageUrl: DATA_URI }) as { imageUrl: string };
    expect(out.imageUrl).not.toContain('AAAA');
    expect(out.imageUrl).toContain('data-URI');
    expect(out.imageUrl).toContain('image/png');
    expect(out.imageUrl.length).toBeLessThan(80);
  });

  it('data-URI tanpa mime tetap tertangani', () => {
    const out = redactAdminPayload({ x: 'data:,halo' }) as { x: string };
    expect(out.x).toContain('tanpa-mime');
  });

  it('string panjang dipotong dengan penanda jumlah asli', () => {
    const panjang = 'x'.repeat(PAYLOAD_MAX_STRING + 500);
    const out = redactAdminPayload({ reason: panjang }) as { reason: string };
    expect(out.reason.length).toBeLessThan(PAYLOAD_MAX_STRING + 60);
    expect(out.reason).toContain(String(PAYLOAD_MAX_STRING + 500));
  });

  it('string pendek diteruskan apa adanya', () => {
    expect(redactAdminPayload({ reason: 'Jualan barang palsu' })).toEqual({
      reason: 'Jualan barang palsu',
    });
  });

  it('angka & boolean tidak diubah', () => {
    expect(redactAdminPayload({ approved: true, order: 3 })).toEqual({ approved: true, order: 3 });
  });

  it('null & undefined jadi null (kolom Json tidak menerima undefined)', () => {
    expect(redactAdminPayload(null)).toBeNull();
    expect(redactAdminPayload(undefined)).toBeNull();
  });

  it('array dipangkas ke 20 elemen + penanda sisa', () => {
    const out = redactAdminPayload({ ids: Array.from({ length: 30 }, (_, i) => `id-${i}`) }) as {
      ids: string[];
    };
    expect(out.ids).toHaveLength(21);
    expect(out.ids[20]).toBe('[+10 elemen lain]');
  });

  it('array pendek utuh', () => {
    const out = redactAdminPayload({ ids: ['a', 'b'] }) as { ids: string[] };
    expect(out.ids).toEqual(['a', 'b']);
  });

  it('data-URI di dalam array juga dibuang', () => {
    const out = redactAdminPayload({ evidenceImages: [DATA_URI, 'https://a.test/x.png'] }) as {
      evidenceImages: string[];
    };
    expect(out.evidenceImages[0]).toContain('data-URI');
    expect(out.evidenceImages[1]).toBe('https://a.test/x.png');
  });

  it('objek bersarang ditelusuri sampai batas kedalaman', () => {
    const dalam = { a: { b: { c: { d: { e: 'terlalu jauh' } } } } };
    expect(JSON.stringify(redactAdminPayload(dalam))).toContain('terlalu dalam');
  });

  it('hasilnya selalu bisa di-JSON.stringify', () => {
    const aneh = { fn: () => 1, big: 10n, sym: Symbol('x'), ok: 'ya' };
    expect(() => JSON.stringify(redactAdminPayload(aneh))).not.toThrow();
  });
});

describe('adminLogQuerySchema', () => {
  it('default page 1 limit 30', () => {
    const p = adminLogQuerySchema.parse({});
    expect(p.page).toBe(1);
    expect(p.limit).toBe(30);
  });

  it('page & limit dari query string (angka dalam string) tetap terbaca', () => {
    const p = adminLogQuerySchema.parse({ page: '3', limit: '10' });
    expect(p.page).toBe(3);
    expect(p.limit).toBe(10);
  });

  it('limit dibatasi 100 supaya satu request tidak menarik seluruh tabel', () => {
    expect(adminLogQuerySchema.safeParse({ limit: 500 }).success).toBe(false);
  });

  it('action di luar daftar ditolak', () => {
    expect(adminLogQuerySchema.safeParse({ action: 'DROP_TABLE' }).success).toBe(false);
    expect(adminLogQuerySchema.safeParse({ action: 'SUSPEND_USER' }).success).toBe(true);
  });

  it('targetType di luar daftar ditolak', () => {
    expect(adminLogQuerySchema.safeParse({ targetType: 'GALAXY' }).success).toBe(false);
  });

  it('adminId harus uuid', () => {
    expect(adminLogQuerySchema.safeParse({ adminId: 'bukan-uuid' }).success).toBe(false);
  });
});

describe('ADMIN_TARGET_TYPES', () => {
  it('memuat semua sasaran yang dipakai route', () => {
    for (const t of ['USER', 'SHOP', 'PRODUCT', 'REFUND', 'REPORT', 'COMPLAINT', 'VOUCHER', 'BANNER', 'CATEGORY']) {
      expect(ADMIN_TARGET_TYPES).toContain(t);
    }
  });
});
