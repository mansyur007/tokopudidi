// Flash sale (M15-C1).
//
// Yang diuji di sini adalah aturan yang menentukan berapa pembeli ditagih dan
// kapan sebuah slot flash benar-benar terpakai. Keduanya tidak boleh berubah
// diam-diam: yang pertama menyangkut uang orang, yang kedua menyangkut kuota
// yang sudah dijanjikan ke pembeli lain.
import { describe, it, expect } from 'vitest';
import {
  resolveUnitPrice,
  getUnitPrice,
  formatSisaWaktu,
  flashSaleCreateSchema,
  flashSaleItemCreateSchema,
  flashSaleItemUpdateSchema,
} from '@tokopudidi/shared';

const SEKARANG = new Date('2026-08-02T10:00:00Z');

const produk = (over: Record<string, unknown> = {}) => ({
  price: 100_000,
  ...over,
});

describe('resolveUnitPrice — prioritas harga', () => {
  it('tanpa promo apa pun -> harga normal', () => {
    const r = resolveUnitPrice(produk(), 1, SEKARANG);
    expect(r).toEqual({ price: 100_000, source: 'NORMAL' });
  });

  it('flash menang atas sale price (M9-B3)', () => {
    const r = resolveUnitPrice(
      produk({
        salePrice: 80_000,
        saleStartAt: '2026-08-01T00:00:00Z',
        saleEndAt: '2026-08-30T00:00:00Z',
        flashPrice: 60_000,
      }),
      1,
      SEKARANG,
    );
    expect(r).toEqual({ price: 60_000, source: 'FLASH' });
  });

  it('flash menang atas harga grosir (M13-B1) saat memang lebih murah', () => {
    const r = resolveUnitPrice(
      produk({ wholesaleTiers: [{ minQty: 10, price: 70_000 }], flashPrice: 60_000 }),
      10,
      SEKARANG,
    );
    expect(r).toEqual({ price: 60_000, source: 'FLASH' });
  });

  /**
   * Ini pasangan aturan yang paling gampang salah dibaca dari kata "prioritas".
   * Urutan flash > sale > grosir menentukan siapa yang menang SAAT SERI, bukan
   * izin menagih lebih mahal — kontrak `min` dari M13-B1 tetap berlaku.
   */
  it('flash TIDAK dipakai kalau tier grosir lebih murah — dan slotnya tidak terbakar', () => {
    const r = resolveUnitPrice(
      produk({ wholesaleTiers: [{ minQty: 50, price: 45_000 }], flashPrice: 60_000 }),
      50,
      SEKARANG,
    );
    expect(r).toEqual({ price: 45_000, source: 'WHOLESALE' });
    // `source` inilah yang dipakai checkout untuk memutuskan memotong kuota.
    expect(r.source).not.toBe('FLASH');
  });

  it('flash TIDAK dipakai kalau sale price penjual lebih murah', () => {
    const r = resolveUnitPrice(
      produk({
        salePrice: 50_000,
        saleStartAt: '2026-08-01T00:00:00Z',
        saleEndAt: '2026-08-30T00:00:00Z',
        flashPrice: 60_000,
      }),
      1,
      SEKARANG,
    );
    expect(r).toEqual({ price: 50_000, source: 'SALE' });
  });

  it('saat harganya seri, prioritas yang menentukan — flash yang dilaporkan', () => {
    const r = resolveUnitPrice(
      produk({ wholesaleTiers: [{ minQty: 5, price: 60_000 }], flashPrice: 60_000 }),
      5,
      SEKARANG,
    );
    expect(r).toEqual({ price: 60_000, source: 'FLASH' });
  });

  it('sale yang sudah lewat periodenya tidak menghalangi flash', () => {
    const r = resolveUnitPrice(
      produk({
        salePrice: 40_000,
        saleStartAt: '2026-01-01T00:00:00Z',
        saleEndAt: '2026-02-01T00:00:00Z',
        flashPrice: 60_000,
      }),
      1,
      SEKARANG,
    );
    expect(r).toEqual({ price: 60_000, source: 'FLASH' });
  });

  it('flashPrice null/undefined tidak mengubah perilaku lama', () => {
    const dasar = produk({ wholesaleTiers: [{ minQty: 10, price: 70_000 }] });
    expect(resolveUnitPrice(dasar, 10, SEKARANG).price).toBe(70_000);
    expect(resolveUnitPrice({ ...dasar, flashPrice: null }, 10, SEKARANG).price).toBe(70_000);
  });

  it('getUnitPrice tetap jadi pembungkus yang sama angkanya', () => {
    const p = produk({ flashPrice: 60_000, wholesaleTiers: [{ minQty: 50, price: 45_000 }] });
    expect(getUnitPrice(p, 1, SEKARANG)).toBe(resolveUnitPrice(p, 1, SEKARANG).price);
    expect(getUnitPrice(p, 50, SEKARANG)).toBe(resolveUnitPrice(p, 50, SEKARANG).price);
  });
});

describe('formatSisaWaktu', () => {
  const detik = (n: number) => n * 1000;

  it('di bawah sehari -> HH:MM:SS', () => {
    expect(formatSisaWaktu(detik(9))).toBe('00:00:09');
    expect(formatSisaWaktu(detik(2 * 3600 + 15 * 60 + 9))).toBe('02:15:09');
    expect(formatSisaWaktu(detik(23 * 3600 + 59 * 60 + 59))).toBe('23:59:59');
  });

  /**
   * Bentuk inilah yang dulu salah: event tujuh hari dirender "165:30:47".
   * Angkanya benar, tapi tidak ada pembeli yang bisa membacanya sebagai waktu.
   */
  it('lebih dari sehari -> ada bagian "N hari", jam kembali < 24', () => {
    expect(formatSisaWaktu(detik(24 * 3600))).toBe('1 hari 00:00:00');
    expect(formatSisaWaktu(detik(165 * 3600 + 30 * 60 + 47))).toBe('6 hari 21:30:47');
  });

  it('nol dan negatif -> 00:00:00, bukan angka minus di layar', () => {
    expect(formatSisaWaktu(0)).toBe('00:00:00');
    expect(formatSisaWaktu(-5000)).toBe('00:00:00');
  });
});

describe('schema event', () => {
  it('menolak periode yang berakhir sebelum mulai', () => {
    const r = flashSaleCreateSchema.safeParse({
      name: 'Flash Sale Gajian',
      startAt: '2026-08-02T10:00:00.000Z',
      endAt: '2026-08-02T09:00:00.000Z',
    });
    expect(r.success).toBe(false);
  });

  it('menolak periode nol-detik — event yang tidak pernah berjalan', () => {
    const r = flashSaleCreateSchema.safeParse({
      name: 'Flash Sale Gajian',
      startAt: '2026-08-02T10:00:00.000Z',
      endAt: '2026-08-02T10:00:00.000Z',
    });
    expect(r.success).toBe(false);
  });

  it('menerima periode yang wajar', () => {
    const r = flashSaleCreateSchema.safeParse({
      name: 'Flash Sale Gajian',
      startAt: '2026-08-02T10:00:00.000Z',
      endAt: '2026-08-02T14:00:00.000Z',
    });
    expect(r.success).toBe(true);
  });
});

describe('schema slot', () => {
  it('menolak kuota 0 — slot tanpa kuota cuma harga palsu di layar', () => {
    const r = flashSaleItemCreateSchema.safeParse({
      productId: '11111111-1111-4111-8111-111111111111',
      salePrice: 50_000,
      quota: 0,
    });
    expect(r.success).toBe(false);
  });

  it('menolak harga di bawah Rp 100', () => {
    const r = flashSaleItemCreateSchema.safeParse({
      productId: '11111111-1111-4111-8111-111111111111',
      salePrice: 99,
      quota: 10,
    });
    expect(r.success).toBe(false);
  });

  it('menolak update yang tidak mengubah apa pun', () => {
    // Kalau ini lolos, panel admin bisa melaporkan "slot diperbarui" untuk
    // permintaan yang tidak menyentuh satu kolom pun.
    expect(flashSaleItemUpdateSchema.safeParse({}).success).toBe(false);
    expect(flashSaleItemUpdateSchema.safeParse({ quota: 5 }).success).toBe(true);
  });
});
