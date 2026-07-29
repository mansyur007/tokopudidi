// Unit test agregasi statistik produk (M11-B4) — logic yang tidak bergantung DB.
import { describe, it, expect } from 'vitest';
import {
  dayKey,
  buildDayKeys,
  bucketByDay,
  conversionPct,
  parseRange,
  REVENUE_STATUSES,
} from './product.stats';

// Tengah hari, supaya pergeseran timezone tidak diam-diam memindahkan tanggal
// dalam test itu sendiri.
const at = (iso: string) => new Date(`${iso}T12:00:00`);

describe('dayKey', () => {
  it('format YYYY-MM-DD dengan padding', () => {
    expect(dayKey(at('2026-07-05'))).toBe('2026-07-05');
    expect(dayKey(at('2026-11-30'))).toBe('2026-11-30');
  });

  // Kunci deret hari dan kunci baris data harus dibuat fungsi yang sama, kalau
  // tidak batang chart bisa jatuh ke kolom yang salah.
  it('konsisten untuk jam berapa pun dalam hari yang sama', () => {
    expect(dayKey(new Date('2026-07-05T00:30:00'))).toBe('2026-07-05');
    expect(dayKey(new Date('2026-07-05T23:30:00'))).toBe('2026-07-05');
  });
});

describe('buildDayKeys', () => {
  it('7 hari berakhir hari ini', () => {
    const keys = buildDayKeys(7, at('2026-07-29'));
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe('2026-07-23');
    expect(keys[6]).toBe('2026-07-29');
  });

  it('30 hari', () => {
    const keys = buildDayKeys(30, at('2026-07-29'));
    expect(keys).toHaveLength(30);
    expect(keys[29]).toBe('2026-07-29');
  });

  it('melewati batas bulan dengan benar', () => {
    const keys = buildDayKeys(3, at('2026-03-02'));
    expect(keys).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
  });

  it('urut menaik tanpa duplikat', () => {
    const keys = buildDayKeys(30, at('2026-07-29'));
    expect([...keys].sort()).toEqual(keys);
    expect(new Set(keys).size).toBe(30);
  });
});

describe('bucketByDay', () => {
  const keys = buildDayKeys(3, at('2026-07-29')); // 27, 28, 29

  it('hari tanpa data tetap muncul bernilai 0', () => {
    const out = bucketByDay(keys, [at('2026-07-29')]);
    expect(out).toEqual([
      { date: '2026-07-27', count: 0 },
      { date: '2026-07-28', count: 0 },
      { date: '2026-07-29', count: 1 },
    ]);
  });

  it('menjumlahkan beberapa baris di hari yang sama', () => {
    const out = bucketByDay(keys, [at('2026-07-28'), at('2026-07-28'), at('2026-07-27')]);
    expect(out.map((b) => b.count)).toEqual([1, 2, 0]);
  });

  it('baris di luar rentang diabaikan, bukan error', () => {
    const out = bucketByDay(keys, [at('2026-01-01'), at('2026-07-29')]);
    expect(out.map((b) => b.count)).toEqual([0, 0, 1]);
  });

  it('tanpa data sama sekali menghasilkan deret nol utuh', () => {
    const out = bucketByDay(keys, []);
    expect(out).toHaveLength(3);
    expect(out.every((b) => b.count === 0)).toBe(true);
  });

  it('panjang keluaran selalu sama dengan jumlah hari yang diminta', () => {
    expect(bucketByDay(buildDayKeys(30, at('2026-07-29')), [])).toHaveLength(30);
  });
});

describe('conversionPct', () => {
  // Tanpa guard ini hasilnya NaN dan tampil "NaN%" di UI.
  it('null kalau belum ada penonton', () => {
    expect(conversionPct(0, 0)).toBeNull();
    expect(conversionPct(5, 0)).toBeNull();
  });

  it('nol pembeli tetap 0%, bukan null', () => {
    expect(conversionPct(0, 10)).toBe(0);
  });

  it('dibulatkan ke 1 desimal', () => {
    expect(conversionPct(1, 3)).toBe(33.3);
    expect(conversionPct(2, 3)).toBe(66.7);
    expect(conversionPct(1, 8)).toBe(12.5);
  });

  // Pembeli yang melihat produk sebelum rentang ini tetap terhitung pembeli.
  it('boleh melebihi 100% — itu bukan bug', () => {
    expect(conversionPct(3, 2)).toBe(150);
  });
});

describe('parseRange', () => {
  it('30d dikenali', () => {
    expect(parseRange('30d')).toEqual({ key: '30d', days: 30 });
  });

  it('default 7d untuk nilai apa pun yang lain', () => {
    expect(parseRange('7d')).toEqual({ key: '7d', days: 7 });
    expect(parseRange(undefined)).toEqual({ key: '7d', days: 7 });
    expect(parseRange('sembarang')).toEqual({ key: '7d', days: 7 });
    expect(parseRange('90d')).toEqual({ key: '7d', days: 7 });
  });
});

describe('REVENUE_STATUSES', () => {
  // Harus sama dengan weekRevenue di seller.dashboard.routes, kalau tidak angka
  // pendapatan di dua halaman akan berbeda untuk produk yang sama.
  it('mencakup status yang menghasilkan uang', () => {
    expect(REVENUE_STATUSES).toEqual(['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED']);
  });

  it('tidak menghitung order batal, kedaluwarsa, atau direfund', () => {
    for (const s of ['CANCELLED', 'EXPIRED', 'REFUNDED', 'PENDING_PAYMENT']) {
      expect(REVENUE_STATUSES).not.toContain(s);
    }
  });
});
