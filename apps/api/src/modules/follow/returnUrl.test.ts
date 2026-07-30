// Guard redirect setelah login (`?return=`), dipakai tombol Follow toko (M13-A1).
// Diuji di sini karena hanya workspace api yang menjalankan Vitest; fungsinya
// sendiri hidup di packages/shared supaya web bisa memakainya.
import { describe, it, expect } from 'vitest';
import { safeReturnPath } from '@tokopudidi/shared';

describe('safeReturnPath', () => {
  it('meloloskan path internal', () => {
    expect(safeReturnPath('/toko/warung-bu-sri')).toBe('/toko/warung-bu-sri');
    expect(safeReturnPath('/cari?q=kopi&page=2')).toBe('/cari?q=kopi&page=2');
  });

  it('kosong / tidak ada -> null (pemanggil pakai default)', () => {
    expect(safeReturnPath(null)).toBeNull();
    expect(safeReturnPath(undefined)).toBeNull();
    expect(safeReturnPath('')).toBeNull();
  });

  it('menolak URL absolut ke domain lain', () => {
    expect(safeReturnPath('https://situs-palsu.example/login')).toBeNull();
    expect(safeReturnPath('http://situs-palsu.example')).toBeNull();
    expect(safeReturnPath('javascript:alert(1)')).toBeNull();
  });

  it('menolak bentuk protocol-relative yang menyamar sebagai path', () => {
    // Keduanya diawali "/" tapi browser membacanya sebagai host lain.
    expect(safeReturnPath('//situs-palsu.example')).toBeNull();
    expect(safeReturnPath('/\\situs-palsu.example')).toBeNull();
  });

  it('menolak path relatif (tidak diawali /)', () => {
    expect(safeReturnPath('toko/warung')).toBeNull();
    expect(safeReturnPath('../admin')).toBeNull();
  });

  it('menolak karakter kontrol yang dipakai menyelundupkan skema', () => {
    expect(safeReturnPath('/\n/situs-palsu.example')).toBeNull();
    expect(safeReturnPath('/toko\t/admin')).toBeNull();
  });
});
