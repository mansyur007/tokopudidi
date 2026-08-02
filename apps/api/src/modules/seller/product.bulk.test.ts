// Bulk edit stok & harga (M14-B2). Yang diuji: aturan yang tidak bisa dilihat
// zod (tabrakan harga baru dengan diskon & harga grosir existing), plus bentuk
// payload yang boleh masuk.
import { describe, it, expect } from 'vitest';
import { bulkProductUpdateSchema, MAX_BULK_PRODUCT_ITEMS } from '@tokopudidi/shared';
import { findBulkPriceConflicts, toBulkUpdateData, type BulkTargetProduct } from './product.bulk';

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';

const produk = (over: Partial<BulkTargetProduct> = {}): BulkTargetProduct => ({
  id: ID_A,
  name: 'Kopi Gayo 250g',
  price: 50_000,
  salePrice: null,
  wholesaleTiers: [],
  ...over,
});

describe('findBulkPriceConflicts — diskon periodik (M9-B3)', () => {
  it('harga baru di bawah harga diskon ditolak', () => {
    const konflik = findBulkPriceConflicts(
      [{ id: ID_A, price: 30_000 }],
      [produk({ salePrice: 40_000 })],
    );
    expect(konflik).toHaveLength(1);
    expect(konflik[0].id).toBe(ID_A);
    // Pesannya harus menyebut angka batasnya — "harga tidak valid" saja tidak
    // memberi tahu seller harus mengisi berapa.
    expect(konflik[0].reason).toContain('40.000');
  });

  it('harga baru sama dengan harga diskon juga ditolak (diskon jadi tidak berarti)', () => {
    expect(
      findBulkPriceConflicts([{ id: ID_A, price: 40_000 }], [produk({ salePrice: 40_000 })]),
    ).toHaveLength(1);
  });

  it('harga baru di atas harga diskon lolos', () => {
    expect(
      findBulkPriceConflicts([{ id: ID_A, price: 45_000 }], [produk({ salePrice: 40_000 })]),
    ).toHaveLength(0);
  });
});

describe('findBulkPriceConflicts — harga grosir (M13-B1)', () => {
  const tiers = [{ minQty: 5, price: 45_000 }, { minQty: 10, price: 42_000 }];

  it('harga baru di bawah tier mana pun ditolak', () => {
    const konflik = findBulkPriceConflicts([{ id: ID_A, price: 40_000 }], [produk({ wholesaleTiers: tiers })]);
    expect(konflik).toHaveLength(1);
    // Yang disebut adalah tier TERTINGGI yang menabrak (45.000), bukan yang
    // pertama ketemu — itulah batas yang benar-benar harus dilewati.
    expect(konflik[0].reason).toContain('45.000');
  });

  it('urutan tier di array tidak mengubah angka batas yang dilaporkan', () => {
    const terbalik = [...tiers].reverse();
    const konflik = findBulkPriceConflicts([{ id: ID_A, price: 40_000 }], [produk({ wholesaleTiers: terbalik })]);
    expect(konflik[0].reason).toContain('45.000');
  });

  it('harga baru di atas semua tier lolos', () => {
    expect(
      findBulkPriceConflicts([{ id: ID_A, price: 46_000 }], [produk({ wholesaleTiers: tiers })]),
    ).toHaveLength(0);
  });
});

describe('findBulkPriceConflicts — cakupan pemeriksaan', () => {
  it('baris yang tidak mengubah harga tidak diperiksa sama sekali', () => {
    // Produk ini datanya sudah tidak konsisten dari sebelumnya (tier >= price).
    // Menyunting stoknya saja tidak boleh ikut diblokir — itu tidak memperbaiki
    // apa pun, cuma mengunci pekerjaan yang tak ada kaitannya.
    const rusak = produk({ price: 40_000, wholesaleTiers: [{ minQty: 5, price: 45_000 }] });
    expect(findBulkPriceConflicts([{ id: ID_A, stock: 12 }], [rusak])).toHaveLength(0);
    expect(findBulkPriceConflicts([{ id: ID_A, isActive: false }], [rusak])).toHaveLength(0);
  });

  it('memeriksa tiap baris sendiri-sendiri, bukan berhenti di yang pertama', () => {
    const konflik = findBulkPriceConflicts(
      [{ id: ID_A, price: 10_000 }, { id: ID_B, price: 10_000 }],
      [produk({ salePrice: 20_000 }), produk({ id: ID_B, name: 'Teh', salePrice: 15_000 })],
    );
    expect(konflik.map((c) => c.id)).toEqual([ID_A, ID_B]);
  });

  it('satu alasan per baris — diskon dilaporkan, tidak ditumpuk dengan grosir', () => {
    const konflik = findBulkPriceConflicts(
      [{ id: ID_A, price: 10_000 }],
      [produk({ salePrice: 40_000, wholesaleTiers: [{ minQty: 5, price: 45_000 }] })],
    );
    expect(konflik).toHaveLength(1);
  });

  it('produk tanpa diskon & tanpa tier selalu lolos', () => {
    expect(findBulkPriceConflicts([{ id: ID_A, price: 100 }], [produk()])).toHaveLength(0);
  });
});

describe('toBulkUpdateData', () => {
  it('hanya menulis kolom yang dikirim', () => {
    expect(toBulkUpdateData({ id: ID_A, stock: 0 })).toEqual({ stock: 0 });
    expect(toBulkUpdateData({ id: ID_A, isActive: false })).toEqual({ isActive: false });
  });

  it('nilai falsy tetap ikut tertulis, bukan dianggap tidak dikirim', () => {
    // stock 0 dan isActive false adalah perubahan yang sah — kalau tersaring
    // sebagai "kosong", menghabiskan stok lewat bulk edit diam-diam gagal.
    const data = toBulkUpdateData({ id: ID_A, stock: 0, isActive: false });
    expect(data).toEqual({ stock: 0, isActive: false });
  });
});

describe('bulkProductUpdateSchema', () => {
  const ok = (items: unknown[]) => bulkProductUpdateSchema.safeParse({ items }).success;

  it('menerima baris yang mengubah satu kolom saja', () => {
    expect(ok([{ id: ID_A, stock: 5 }])).toBe(true);
    expect(ok([{ id: ID_A, price: 1000, stock: 5, isActive: true }])).toBe(true);
  });

  it('menolak baris tanpa perubahan apa pun', () => {
    expect(ok([{ id: ID_A }])).toBe(false);
  });

  it('menolak id produk kembar dalam satu payload', () => {
    expect(ok([{ id: ID_A, stock: 1 }, { id: ID_A, stock: 2 }])).toBe(false);
  });

  it('menolak payload kosong dan yang melebihi batas', () => {
    expect(ok([])).toBe(false);
    const terlalu = Array.from({ length: MAX_BULK_PRODUCT_ITEMS + 1 }, (_, i) => ({
      id: `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`,
      stock: 1,
    }));
    expect(ok(terlalu)).toBe(false);
  });

  it('menegakkan ambang yang sama dengan form satuan', () => {
    expect(ok([{ id: ID_A, price: 99 }])).toBe(false);
    expect(ok([{ id: ID_A, price: 100 }])).toBe(true);
    expect(ok([{ id: ID_A, stock: -1 }])).toBe(false);
    expect(ok([{ id: ID_A, stock: 0 }])).toBe(true);
  });

  it('menolak id yang bukan uuid', () => {
    expect(ok([{ id: 'produk-1', stock: 1 }])).toBe(false);
  });
});
