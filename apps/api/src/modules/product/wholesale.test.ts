// Harga grosir bertingkat (M13-B1).
//
// Ini kode yang menentukan berapa pembeli ditagih, jadi yang diuji bukan cuma
// "jalan": prioritas terhadap sale price, pemilihan tier saat urutan data tidak
// terjamin, dan aturan yang menolak tier tak masuk akal sebelum tersimpan.
import { describe, it, expect } from 'vitest';
import {
  getUnitPrice,
  getWholesaleTierPrice,
  getNextWholesaleTier,
  getEffectivePrice,
  productCreateSchema,
  productUpdateSchema,
  MAX_WHOLESALE_TIERS,
} from '@tokopudidi/shared';

const TIERS = [
  { minQty: 5, price: 9000 },
  { minQty: 10, price: 8000 },
  { minQty: 50, price: 7000 },
];

const produk = (over: Record<string, unknown> = {}) => ({
  price: 10000,
  wholesaleTiers: TIERS,
  ...over,
});

describe('getWholesaleTierPrice', () => {
  it('memilih tier dengan ambang tertinggi yang sudah dilewati qty', () => {
    expect(getWholesaleTierPrice(TIERS, 4)).toBeNull();
    expect(getWholesaleTierPrice(TIERS, 5)).toBe(9000);
    expect(getWholesaleTierPrice(TIERS, 9)).toBe(9000);
    expect(getWholesaleTierPrice(TIERS, 10)).toBe(8000);
    expect(getWholesaleTierPrice(TIERS, 49)).toBe(9000 - 1000); // 8000
    expect(getWholesaleTierPrice(TIERS, 1000)).toBe(7000);
  });

  it('tidak bergantung urutan array — data DB tidak menjamin urutan', () => {
    const acak = [TIERS[2], TIERS[0], TIERS[1]];
    expect(getWholesaleTierPrice(acak, 10)).toBe(8000);
    expect(getWholesaleTierPrice(acak, 60)).toBe(7000);
  });

  it('tanpa tier -> null (bukan 0, yang akan menggratiskan produk)', () => {
    expect(getWholesaleTierPrice([], 100)).toBeNull();
    expect(getWholesaleTierPrice(null, 100)).toBeNull();
    expect(getWholesaleTierPrice(undefined, 100)).toBeNull();
  });
});

describe('getUnitPrice', () => {
  it('produk tanpa tier tetap memakai harga efektif', () => {
    const p = { price: 10000 };
    expect(getUnitPrice(p, 1)).toBe(10000);
    expect(getUnitPrice(p, 999)).toBe(10000);
  });

  it('qty di bawah ambang terkecil -> harga normal', () => {
    expect(getUnitPrice(produk(), 1)).toBe(10000);
    expect(getUnitPrice(produk(), 4)).toBe(10000);
  });

  it('qty melewati ambang -> harga tier', () => {
    expect(getUnitPrice(produk(), 5)).toBe(9000);
    expect(getUnitPrice(produk(), 10)).toBe(8000);
    expect(getUnitPrice(produk(), 50)).toBe(7000);
  });

  it('default qty = 1 supaya pemanggil lama tidak diam-diam dapat harga grosir', () => {
    expect(getUnitPrice(produk())).toBe(10000);
  });

  describe('prioritas terhadap sale price (M9-B3)', () => {
    const mulai = new Date('2026-01-01T00:00:00Z');
    const akhir = new Date('2026-12-31T00:00:00Z');
    const now = new Date('2026-06-01T00:00:00Z');

    it('sale lebih murah dari tier -> sale yang dipakai', () => {
      const p = produk({ salePrice: 6000, saleStartAt: mulai, saleEndAt: akhir });
      // Tier 50 = 7000, tapi sale 6000 lebih murah.
      expect(getUnitPrice(p, 50, now)).toBe(6000);
      expect(getEffectivePrice(p, now)).toBe(6000);
    });

    it('tier lebih murah dari sale -> tier yang dipakai', () => {
      const p = produk({ salePrice: 9500, saleStartAt: mulai, saleEndAt: akhir });
      expect(getUnitPrice(p, 50, now)).toBe(7000);
    });

    it('kontraknya min, bukan "tier menang": beli banyak tidak pernah lebih mahal', () => {
      const p = produk({ salePrice: 5000, saleStartAt: mulai, saleEndAt: akhir });
      const satuan = getUnitPrice(p, 1, now);
      for (const qty of [1, 4, 5, 10, 50, 500]) {
        expect(getUnitPrice(p, qty, now), `qty ${qty}`).toBeLessThanOrEqual(satuan);
      }
    });

    it('di luar periode sale, tier tetap berlaku', () => {
      const setelah = new Date('2027-01-01T00:00:00Z');
      const p = produk({ salePrice: 5000, saleStartAt: mulai, saleEndAt: akhir });
      expect(getUnitPrice(p, 10, setelah)).toBe(8000);
      expect(getUnitPrice(p, 1, setelah)).toBe(10000);
    });
  });

  it('harga satuan tidak pernah naik saat qty bertambah', () => {
    const p = produk();
    let sebelumnya = getUnitPrice(p, 1);
    for (let qty = 2; qty <= 120; qty++) {
      const sekarang = getUnitPrice(p, qty);
      expect(sekarang, `qty ${qty}`).toBeLessThanOrEqual(sebelumnya);
      sebelumnya = sekarang;
    }
  });
});

describe('getNextWholesaleTier', () => {
  it('menunjuk ambang berikutnya yang benar-benar lebih murah', () => {
    expect(getNextWholesaleTier(produk(), 1)?.minQty).toBe(5);
    expect(getNextWholesaleTier(produk(), 5)?.minQty).toBe(10);
    expect(getNextWholesaleTier(produk(), 10)?.minQty).toBe(50);
  });

  it('sudah di tier teratas -> null', () => {
    expect(getNextWholesaleTier(produk(), 50)).toBeNull();
    expect(getNextWholesaleTier(produk(), 999)).toBeNull();
  });

  it('tier berikutnya tidak lebih murah dari harga sekarang -> null', () => {
    // Sale 6500 membuat tier 5 (9000) dan 10 (8000) tidak menarik lagi.
    const p = produk({
      salePrice: 6500,
      saleStartAt: new Date('2026-01-01T00:00:00Z'),
      saleEndAt: new Date('2026-12-31T00:00:00Z'),
    });
    const now = new Date('2026-06-01T00:00:00Z');
    expect(getNextWholesaleTier(p, 1, now)).toBeNull();
  });

  it('produk tanpa tier -> null', () => {
    expect(getNextWholesaleTier({ price: 10000 }, 10)).toBeNull();
  });
});

// ===== Validasi payload seller =====

const produkValid = {
  name: 'Beras Premium 5kg',
  description: 'Beras pulen kualitas premium untuk kebutuhan harian.',
  categoryId: '11111111-1111-4111-8111-111111111111',
  price: 10000,
  stock: 100,
  minOrderQty: 1,
  weight: 5000,
  condition: 'NEW' as const,
  codAvailable: true,
  freeShippingEligible: false,
  isActive: true,
  imageUrls: ['https://contoh.test/foto.jpg'],
};

const pesan = (r: { success: boolean; error?: { errors: { message: string }[] } }) =>
  r.success ? null : r.error!.errors[0].message;

describe('validasi wholesaleTiers', () => {
  it('menerima tier yang naik & makin murah', () => {
    const r = productCreateSchema.safeParse({ ...produkValid, wholesaleTiers: TIERS });
    expect(pesan(r)).toBeNull();
  });

  it('tanpa tier tetap sah — grosir opsional', () => {
    expect(productCreateSchema.safeParse(produkValid).success).toBe(true);
    expect(productCreateSchema.safeParse({ ...produkValid, wholesaleTiers: [] }).success).toBe(true);
  });

  it('menolak minQty 1 — itu cuma mengganti harga normal lewat pintu belakang', () => {
    const r = productCreateSchema.safeParse({
      ...produkValid,
      wholesaleTiers: [{ minQty: 1, price: 9000 }],
    });
    expect(pesan(r)).toMatch(/mulai dari 2/i);
  });

  it('menolak ambang yang tidak naik', () => {
    const r = productCreateSchema.safeParse({
      ...produkValid,
      wholesaleTiers: [{ minQty: 10, price: 9000 }, { minQty: 5, price: 8000 }],
    });
    expect(pesan(r)).toMatch(/makin besar/i);
  });

  it('menolak ambang kembar', () => {
    const r = productCreateSchema.safeParse({
      ...produkValid,
      wholesaleTiers: [{ minQty: 5, price: 9000 }, { minQty: 5, price: 8000 }],
    });
    expect(pesan(r)).toMatch(/makin besar/i);
  });

  it('menolak harga yang tidak turun', () => {
    const r = productCreateSchema.safeParse({
      ...produkValid,
      wholesaleTiers: [{ minQty: 5, price: 8000 }, { minQty: 10, price: 8000 }],
    });
    expect(pesan(r)).toMatch(/makin murah/i);
  });

  it('menolak tier yang tidak lebih murah dari harga normal', () => {
    const r = productCreateSchema.safeParse({
      ...produkValid,
      price: 8000,
      wholesaleTiers: [{ minQty: 5, price: 9000 }],
    });
    expect(pesan(r)).toMatch(/lebih murah dari harga normal/i);
  });

  it(`menolak lebih dari ${MAX_WHOLESALE_TIERS} tingkat`, () => {
    const banyak = Array.from({ length: MAX_WHOLESALE_TIERS + 1 }, (_, i) => ({
      minQty: (i + 1) * 2,
      price: 9000 - i * 100,
    }));
    const r = productCreateSchema.safeParse({ ...produkValid, wholesaleTiers: banyak });
    expect(pesan(r)).toMatch(new RegExp(`${MAX_WHOLESALE_TIERS} tingkat`, 'i'));
  });

  it('aturan yang sama berlaku di update parsial, dengan pesan sama persis', () => {
    const rusak = { wholesaleTiers: [{ minQty: 10, price: 8000 }, { minQty: 5, price: 7000 }] };
    expect(pesan(productUpdateSchema.safeParse(rusak))).toMatch(/makin besar/i);

    // Tanpa `price` di payload, aturan "lebih murah dari harga normal" tidak
    // bisa diperiksa di sini — route update yang menambalnya memakai harga
    // hasil gabungan payload + data existing.
    const tanpaHarga = { wholesaleTiers: [{ minQty: 5, price: 999999 }] };
    expect(productUpdateSchema.safeParse(tanpaHarga).success).toBe(true);
  });
});
