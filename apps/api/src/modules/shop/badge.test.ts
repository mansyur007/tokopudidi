// Badge reputasi toko (M14-B1). Helper-nya hidup di packages/shared supaya API
// dan FE memakai aturan yang sama; diuji di sini karena hanya workspace api
// yang menjalankan Vitest.
import { describe, it, expect } from 'vitest';
import {
  BADGE_STAR,
  BADGE_STAR_PLUS,
  getShopBadge,
  getShopBadgeMeta,
  type ShopBadge,
} from '@tokopudidi/shared';

const toko = (over: Partial<Parameters<typeof getShopBadge>[0]> = {}) => ({
  isOfficialStore: false,
  ktpVerified: true,
  ratingAvg: 0,
  totalSold: 0,
  ...over,
});

describe('getShopBadge — urutan prioritas', () => {
  it('OFFICIAL menang atas badge performa', () => {
    // Toko official yang ratingnya sedang bagus tetap OFFICIAL, bukan STAR_PLUS.
    expect(getShopBadge(toko({ isOfficialStore: true, ratingAvg: 5, totalSold: 1000 }))).toBe('OFFICIAL');
  });

  it('OFFICIAL tetap menang walau performanya jeblok', () => {
    // Official adalah keputusan kurasi admin — mesin tidak boleh mencabutnya
    // hanya karena rating sedang turun.
    expect(getShopBadge(toko({ isOfficialStore: true, ratingAvg: 1, totalSold: 0 }))).toBe('OFFICIAL');
  });

  it('OFFICIAL tidak butuh ktpVerified', () => {
    expect(getShopBadge(toko({ isOfficialStore: true, ktpVerified: false }))).toBe('OFFICIAL');
  });

  it('STAR_PLUS menang atas STAR saat keduanya terpenuhi', () => {
    expect(getShopBadge(toko({ ratingAvg: 4.8, totalSold: 500 }))).toBe('STAR_PLUS');
  });
});

describe('getShopBadge — ambang performa', () => {
  it('tepat di ambang sudah dapat badge (batasnya inklusif)', () => {
    expect(getShopBadge(toko({ ratingAvg: BADGE_STAR.ratingAvg, totalSold: BADGE_STAR.totalSold }))).toBe('STAR');
    expect(
      getShopBadge(toko({ ratingAvg: BADGE_STAR_PLUS.ratingAvg, totalSold: BADGE_STAR_PLUS.totalSold })),
    ).toBe('STAR_PLUS');
  });

  it('kurang sedikit dari ambang -> turun kelas, bukan dibulatkan naik', () => {
    expect(getShopBadge(toko({ ratingAvg: 4.49, totalSold: 1000 }))).toBe('STAR');
    expect(getShopBadge(toko({ ratingAvg: 5, totalSold: 99 }))).toBe('STAR');
    expect(getShopBadge(toko({ ratingAvg: 3.99, totalSold: 1000 }))).toBeNull();
    expect(getShopBadge(toko({ ratingAvg: 5, totalSold: 9 }))).toBeNull();
  });

  it('kedua syarat wajib, bukan salah satu', () => {
    expect(getShopBadge(toko({ ratingAvg: 5, totalSold: 0 }))).toBeNull();
    expect(getShopBadge(toko({ ratingAvg: 0, totalSold: 10_000 }))).toBeNull();
  });
});

describe('getShopBadge — syarat verifikasi & masukan tak lengkap', () => {
  it('tanpa ktpVerified, performa sebagus apa pun tidak dapat badge', () => {
    // Tanpa syarat ini toko yang identitasnya belum pernah diperiksa bisa
    // memoles diri lewat segelintir transaksi berating bagus.
    expect(getShopBadge(toko({ ktpVerified: false, ratingAvg: 5, totalSold: 10_000 }))).toBeNull();
  });

  it('toko baru (semua nol) tidak dapat badge', () => {
    expect(getShopBadge(toko())).toBeNull();
  });

  it('null/undefined tidak melempar', () => {
    expect(getShopBadge(null)).toBeNull();
    expect(getShopBadge(undefined)).toBeNull();
  });

  it('field yang hilang dianggap nol, bukan NaN', () => {
    expect(getShopBadge({ ktpVerified: true })).toBeNull();
    expect(getShopBadge({ ktpVerified: true, ratingAvg: null, totalSold: null })).toBeNull();
  });
});

describe('getShopBadgeMeta', () => {
  it('tiap badge punya ikon, label, dan penjelasan yang tidak kosong', () => {
    for (const badge of ['OFFICIAL', 'STAR_PLUS', 'STAR'] as ShopBadge[]) {
      const meta = getShopBadgeMeta(badge);
      expect(meta.icon.length).toBeGreaterThan(0);
      expect(meta.label.length).toBeGreaterThan(0);
      // Tooltip wajib menjelaskan artinya — badge tanpa keterangan cuma hiasan
      // yang bikin pembeli menebak.
      expect(meta.description.length).toBeGreaterThan(10);
    }
  });

  it('ambang di penjelasan ikut angka konstantanya', () => {
    expect(getShopBadgeMeta('STAR_PLUS').description).toContain(String(BADGE_STAR_PLUS.totalSold));
    expect(getShopBadgeMeta('STAR').description).toContain(String(BADGE_STAR.totalSold));
  });

  it('badge null -> meta null', () => {
    expect(getShopBadgeMeta(null)).toBeNull();
    expect(getShopBadgeMeta(undefined)).toBeNull();
  });
});
