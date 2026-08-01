// Aturan jeda 24 jam & validasi isi broadcast (M13-B2). Fungsinya hidup di
// packages/shared supaya API dan halaman seller memakai hitungan yang sama;
// diuji di sini karena hanya workspace api yang menjalankan Vitest.
import { describe, it, expect } from 'vitest';
import {
  BROADCAST_BODY_MAX,
  BROADCAST_COOLDOWN_MS,
  BROADCAST_TITLE_MAX,
  broadcastCooldownRemainingMs,
  broadcastCreateSchema,
  canBroadcastNow,
  formatCooldownRemaining,
} from '@tokopudidi/shared';

const now = new Date('2026-08-01T12:00:00.000Z');
const jamLalu = (n: number) => new Date(now.getTime() - n * 60 * 60 * 1000);

describe('broadcastCooldownRemainingMs', () => {
  it('toko yang belum pernah broadcast boleh kirim', () => {
    expect(broadcastCooldownRemainingMs(null, now)).toBe(0);
    expect(broadcastCooldownRemainingMs(undefined, now)).toBe(0);
    expect(canBroadcastNow(null, now)).toBe(true);
  });

  it('tepat 24 jam lalu sudah lewat jeda (batasnya inklusif)', () => {
    expect(broadcastCooldownRemainingMs(jamLalu(24), now)).toBe(0);
    expect(broadcastCooldownRemainingMs(jamLalu(25), now)).toBe(0);
  });

  it('baru saja kirim -> sisa hampir 24 jam', () => {
    expect(broadcastCooldownRemainingMs(now, now)).toBe(BROADCAST_COOLDOWN_MS);
    expect(broadcastCooldownRemainingMs(jamLalu(1), now)).toBe(23 * 60 * 60 * 1000);
    expect(canBroadcastNow(jamLalu(1), now)).toBe(false);
  });

  it('menerima string ISO, bukan hanya Date (respons API mengirim string)', () => {
    expect(broadcastCooldownRemainingMs(jamLalu(6).toISOString(), now)).toBe(18 * 60 * 60 * 1000);
  });

  it('tanggal rusak dianggap boleh kirim, bukan terkunci selamanya', () => {
    expect(broadcastCooldownRemainingMs('bukan-tanggal', now)).toBe(0);
  });

  it('sentAt di masa depan (jam server bergeser) tetap menahan, bukan dilewatkan', () => {
    const besok = new Date(now.getTime() + 60 * 60 * 1000);
    expect(broadcastCooldownRemainingMs(besok, now)).toBeGreaterThan(BROADCAST_COOLDOWN_MS);
  });
});

describe('formatCooldownRemaining', () => {
  it('menyusun jam + menit', () => {
    expect(formatCooldownRemaining(3 * 3600_000 + 12 * 60_000)).toBe('3 jam 12 menit');
    expect(formatCooldownRemaining(2 * 3600_000)).toBe('2 jam');
    expect(formatCooldownRemaining(8 * 60_000)).toBe('8 menit');
  });

  it('membulatkan ke atas supaya tidak menjanjikan lebih cepat dari kenyataan', () => {
    // 30 detik: kalau dibulatkan ke bawah jadi "0 menit" dan seller mencoba lagi
    // terlalu cepat, lalu ditolak untuk kedua kalinya.
    expect(formatCooldownRemaining(30_000)).toBe('1 menit');
  });

  it('nol / negatif -> "sekarang"', () => {
    expect(formatCooldownRemaining(0)).toBe('sekarang');
    expect(formatCooldownRemaining(-5000)).toBe('sekarang');
  });
});

describe('broadcastCreateSchema', () => {
  const valid = { title: 'Diskon Akhir Pekan', body: 'Semua kopi diskon 20% sampai Minggu ini ya!' };

  it('meloloskan isi wajar, productId opsional', () => {
    expect(broadcastCreateSchema.safeParse(valid).success).toBe(true);
    expect(
      broadcastCreateSchema.safeParse({
        ...valid,
        productId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      }).success,
    ).toBe(true);
  });

  it('menolak judul/isi kosong atau terlalu pendek', () => {
    expect(broadcastCreateSchema.safeParse({ ...valid, title: '  ' }).success).toBe(false);
    expect(broadcastCreateSchema.safeParse({ ...valid, body: 'promo' }).success).toBe(false);
  });

  it('menolak yang melebihi batas panjang', () => {
    expect(
      broadcastCreateSchema.safeParse({ ...valid, title: 'a'.repeat(BROADCAST_TITLE_MAX + 1) }).success,
    ).toBe(false);
    expect(
      broadcastCreateSchema.safeParse({ ...valid, body: 'a'.repeat(BROADCAST_BODY_MAX + 1) }).success,
    ).toBe(false);
  });

  it('menolak productId yang bukan uuid', () => {
    expect(broadcastCreateSchema.safeParse({ ...valid, productId: 'produk-1' }).success).toBe(false);
  });
});
