import { describe, it, expect } from 'vitest';
import { expandCategoryTree, subtotalDalamKategori } from '@tokopudidi/shared';

// Pohon contoh:
//   elektronik ─┬─ hp ── aksesoris-hp
//               └─ laptop
//   sembako
const POHON = [
  { id: 'elektronik', parentId: null },
  { id: 'hp', parentId: 'elektronik' },
  { id: 'aksesoris-hp', parentId: 'hp' },
  { id: 'laptop', parentId: 'elektronik' },
  { id: 'sembako', parentId: null },
];

describe('expandCategoryTree', () => {
  it('menyertakan dirinya sendiri', () => {
    expect(expandCategoryTree('sembako', POHON)).toEqual(new Set(['sembako']));
  });

  it('menyertakan cucu, bukan cuma anak langsung', () => {
    // Inti item ini: produk hidup di daun. Kalau hanya anak langsung yang ikut,
    // voucher "Elektronik" tidak berlaku untuk aksesoris HP dan praktis mati.
    expect(expandCategoryTree('elektronik', POHON)).toEqual(
      new Set(['elektronik', 'hp', 'aksesoris-hp', 'laptop']),
    );
  });

  it('tidak menyeret saudara atau induk', () => {
    const scope = expandCategoryTree('hp', POHON);
    expect(scope).toEqual(new Set(['hp', 'aksesoris-hp']));
    expect(scope.has('laptop')).toBe(false);
    expect(scope.has('elektronik')).toBe(false);
  });

  it('kategori yang tidak ada di daftar tetap jadi dirinya sendiri, bukan semua', () => {
    // Voucher yang menunjuk kategori terhapus harus berhenti berlaku, bukan
    // tiba-tiba berlaku untuk seluruh katalog.
    expect(expandCategoryTree('sudah-dihapus', POHON)).toEqual(new Set(['sudah-dihapus']));
  });

  it('berhenti pada data bersiklus, tidak berputar selamanya', () => {
    // Tidak ada constraint database yang mencegah A→B→A. Penelusuran naif akan
    // menggantung, dan gejalanya di produksi adalah request yang tidak pernah
    // selesai — bukan error yang bisa dibaca.
    const siklus = [
      { id: 'a', parentId: 'b' },
      { id: 'b', parentId: 'a' },
    ];
    expect(expandCategoryTree('a', siklus)).toEqual(new Set(['a', 'b']));
  });

  it('daftar kosong tidak melempar', () => {
    expect(expandCategoryTree('x', [])).toEqual(new Set(['x']));
  });
});

describe('subtotalDalamKategori', () => {
  const items = [
    { categoryId: 'hp', subtotal: 100 },
    { categoryId: 'laptop', subtotal: 250 },
    { categoryId: 'sembako', subtotal: 40 },
  ];

  it('hanya menjumlah item yang masuk scope', () => {
    expect(subtotalDalamKategori(items, expandCategoryTree('elektronik', POHON))).toBe(350);
    expect(subtotalDalamKategori(items, expandCategoryTree('sembako', POHON))).toBe(40);
  });

  it('tidak ada yang cocok → 0, bukan total keranjang', () => {
    expect(subtotalDalamKategori(items, new Set(['fashion']))).toBe(0);
  });

  it('keranjang kosong → 0', () => {
    expect(subtotalDalamKategori([], expandCategoryTree('elektronik', POHON))).toBe(0);
  });
});
