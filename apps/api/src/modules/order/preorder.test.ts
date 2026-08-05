// Aturan estimasi pre-order (M15-B1). Diuji di workspace api karena hanya di
// sini Vitest berjalan; fungsinya sendiri hidup di packages/shared.
//
// Kasus campuran ready + pre-order adalah alasan utama file ini ada: sebelumnya
// rumusnya ditulis inline di JSX halaman pesanan, jadi satu-satunya cara
// mengujinya adalah merender halaman — dan akibatnya kriteria "campur ready +
// pre-order pakai lead time terlama" sempat ditandai selesai tanpa satu pun
// test yang membuktikannya.
import { describe, it, expect } from 'vitest';
import { maxPreorderDays, preorderEstimate } from '@tokopudidi/shared';

const PAID = '2026-08-02T00:00:00.000Z';
const hariKe = (n: number) => new Date(new Date(PAID).getTime() + n * 86_400_000);

describe('maxPreorderDays', () => {
  it('pesanan tanpa pre-order sama sekali bernilai 0', () => {
    expect(maxPreorderDays([])).toBe(0);
    expect(maxPreorderDays([{ preorderDays: null }, { preorderDays: null }])).toBe(0);
    // `undefined` (mis. pesanan lama sebelum kolomnya ada) diperlakukan sama.
    expect(maxPreorderDays([{}, {}])).toBe(0);
  });

  it('campur ready + pre-order memakai yang TERLAMA, bukan rata-rata', () => {
    const items = [{ preorderDays: 3 }, { preorderDays: null }, { preorderDays: 10 }];
    expect(maxPreorderDays(items)).toBe(10);
    // Rata-rata (6.5) maupun terpendek (3) akan menjanjikan tanggal yang sudah
    // pasti dilewati sejak awal — keduanya harus salah di sini.
    expect(maxPreorderDays(items)).not.toBe(3);
  });

  it('tidak bergantung urutan item', () => {
    expect(maxPreorderDays([{ preorderDays: 10 }, { preorderDays: 3 }])).toBe(10);
    expect(maxPreorderDays([{ preorderDays: 3 }, { preorderDays: 10 }])).toBe(10);
  });

  it('item non-pre-order tidak menarik hasilnya turun ke 0', () => {
    expect(maxPreorderDays([{ preorderDays: 7 }, { preorderDays: null }])).toBe(7);
  });
});

describe('preorderEstimate', () => {
  it('menambahkan lead time terlama ke tanggal bayar (hari kalender)', () => {
    const est = preorderEstimate([{ preorderDays: 3 }, { preorderDays: 10 }], PAID);
    expect(est).toEqual(hariKe(10));
  });

  it('pesanan tanpa pre-order tidak punya estimasi', () => {
    expect(preorderEstimate([{ preorderDays: null }], PAID)).toBeNull();
    expect(preorderEstimate([], PAID)).toBeNull();
  });

  it('belum dibayar → null, bukan dihitung dari "sekarang"', () => {
    // Kalau titik mulainya jatuh ke waktu sekarang, estimasinya akan mundur
    // sendiri tiap kali halaman dibuka — janji yang tidak pernah jatuh tempo.
    expect(preorderEstimate([{ preorderDays: 10 }], null)).toBeNull();
    expect(preorderEstimate([{ preorderDays: 10 }], undefined)).toBeNull();
  });

  it('menerima Date maupun string ISO', () => {
    const dariString = preorderEstimate([{ preorderDays: 5 }], PAID);
    const dariDate = preorderEstimate([{ preorderDays: 5 }], new Date(PAID));
    expect(dariString).toEqual(dariDate);
    expect(dariDate).toEqual(hariKe(5));
  });
});
