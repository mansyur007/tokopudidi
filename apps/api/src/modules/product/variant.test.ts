// Unit test variant multi-axis (M11-A8) — logic yang tidak bergantung DB.
import { describe, it, expect } from 'vitest';
import {
  cartesian, countCombinations, comboKey, comboLabel, variantLabel,
  availableValues, findVariant,
  MAX_VARIANT_COMBINATIONS,
  productCreateSchema,
} from '@tokopudidi/shared';
import { flattenVariant } from './variant.read';

const OPTS = [
  { name: 'Warna', values: ['Merah', 'Biru'] },
  { name: 'Ukuran', values: ['S', 'M'] },
];

describe('cartesian & countCombinations', () => {
  it('kombinasi 2 sumbu, urutan option dipertahankan', () => {
    expect(cartesian(OPTS)).toEqual([
      ['Merah', 'S'], ['Merah', 'M'],
      ['Biru', 'S'], ['Biru', 'M'],
    ]);
  });

  it('1 sumbu tetap menghasilkan array bersarang', () => {
    expect(cartesian([{ name: 'Varian', values: ['A', 'B'] }])).toEqual([['A'], ['B']]);
  });

  it('tanpa option hasilnya kosong', () => {
    expect(cartesian([])).toEqual([]);
    expect(countCombinations([])).toBe(0);
  });

  // Kartesius dengan himpunan kosong memang kosong — kalau tidak dijaga,
  // opsi yang baru dibuat (belum ada nilainya) akan menghapus seluruh tabel.
  it('option tanpa nilai menghasilkan kosong, bukan crash', () => {
    expect(cartesian([{ name: 'Warna', values: [] }])).toEqual([]);
    expect(cartesian([...OPTS, { name: 'Bahan', values: [] }])).toEqual([]);
  });

  it('countCombinations mengalikan jumlah nilai', () => {
    expect(countCombinations(OPTS)).toBe(4);
    expect(countCombinations([
      { name: 'A', values: ['1', '2', '3'] },
      { name: 'B', values: ['x', 'y'] },
      { name: 'C', values: ['p', 'q'] },
    ])).toBe(12);
  });
});

describe('comboKey', () => {
  it('kombinasi sama menghasilkan kunci sama', () => {
    expect(comboKey(['Merah', 'M'])).toBe(comboKey(['Merah', 'M']));
  });

  it('urutan berbeda = kombinasi berbeda', () => {
    expect(comboKey(['Merah', 'M'])).not.toBe(comboKey(['M', 'Merah']));
  });

  it('spasi di ujung diabaikan', () => {
    expect(comboKey([' Merah ', 'M'])).toBe(comboKey(['Merah', 'M']));
  });

  // Tanpa encoding, nilai yang memuat pemisah bisa memalsukan kombinasi lain.
  it('nilai yang memuat spasi tidak menabrak kombinasi lain', () => {
    expect(comboKey(['A B'])).not.toBe(comboKey(['A', 'B']));
  });

  it('label yang dilihat manusia memakai pemisah garis miring', () => {
    expect(comboLabel(['Merah', 'M'])).toBe('Merah / M');
    expect(comboLabel(['Merah'])).toBe('Merah');
  });
});

describe('availableValues', () => {
  // Merah/S habis; Biru/M nonaktif.
  const variants = [
    { values: ['Merah', 'S'], stock: 0 },
    { values: ['Merah', 'M'], stock: 5 },
    { values: ['Biru', 'S'], stock: 3 },
    { values: ['Biru', 'M'], stock: 2, isActive: false },
  ];

  it('tanpa pilihan, semua nilai yang punya kombinasi berstok tersedia', () => {
    const warna = availableValues(0, OPTS, variants, [undefined, undefined]);
    expect([...warna].sort()).toEqual(['Biru', 'Merah']);
  });

  it('pilih Merah → hanya ukuran yang berstok untuk Merah', () => {
    const ukuran = availableValues(1, OPTS, variants, ['Merah', undefined]);
    expect([...ukuran]).toEqual(['M']); // Merah/S stok 0
  });

  it('pilih Biru → hanya S (Biru/M nonaktif)', () => {
    const ukuran = availableValues(1, OPTS, variants, ['Biru', undefined]);
    expect([...ukuran]).toEqual(['S']);
  });

  // Kalau pilihan pada sumbu yang sedang dihitung ikut menyaring, tiap nilai
  // cuma "tersedia" untuk dirinya sendiri dan chip lain terkunci selamanya.
  it('pilihan pada sumbu itu sendiri diabaikan saat menghitung sumbu itu', () => {
    const warna = availableValues(0, OPTS, variants, ['Merah', undefined]);
    expect([...warna].sort()).toEqual(['Biru', 'Merah']);
  });

  it('pilihan di sumbu lain tetap menyaring', () => {
    const warna = availableValues(0, OPTS, variants, [undefined, 'S']);
    expect([...warna]).toEqual(['Biru']); // Merah/S stok 0
  });
});

describe('findVariant', () => {
  const variants = [
    { id: 'v1', values: ['Merah', 'S'], stock: 1 },
    { id: 'v2', values: ['Biru', 'M'], stock: 1 },
  ];

  it('kombinasi lengkap ketemu', () => {
    expect(findVariant(variants, ['Biru', 'M'], 2)?.id).toBe('v2');
  });

  it('pilihan belum lengkap → null', () => {
    expect(findVariant(variants, ['Biru', undefined], 2)).toBeNull();
    expect(findVariant(variants, [], 2)).toBeNull();
  });

  it('kombinasi yang tidak dijual → null', () => {
    expect(findVariant(variants, ['Merah', 'M'], 2)).toBeNull();
  });
});

describe('flattenVariant', () => {
  it('mengurutkan nilai mengikuti urutan option', () => {
    const out = flattenVariant({
      id: 'v1',
      name: 'Merah / M',
      // sengaja dikirim terbalik
      values: [
        { optionValue: { id: 'ov2', value: 'M', option: { order: 1 } } },
        { optionValue: { id: 'ov1', value: 'Merah', option: { order: 0 } } },
      ],
    });
    expect(out.optionValues).toEqual(['Merah', 'M']);
    expect(out.optionValueIds).toEqual(['ov1', 'ov2']);
  });

  // Data yang belum di-backfill: FE memakai ini untuk jatuh ke mode 1 sumbu.
  it('variant tanpa tautan nilai menghasilkan array kosong', () => {
    const out = flattenVariant({ id: 'v1', name: 'Merah', values: [] });
    expect(out.optionValues).toEqual([]);
  });

  it('membuang kolom join mentah dari respons', () => {
    const out = flattenVariant({ id: 'v1', name: 'Merah', values: [] });
    expect('values' in out).toBe(false);
  });
});

describe('productCreateSchema — aturan varian', () => {
  const base = {
    name: 'Kaos Polos',
    description: 'Kaos katun combed 30s, adem dipakai harian.',
    categoryId: '11111111-1111-4111-8111-111111111111',
    price: 50_000,
    stock: 10,
    weight: 200,
    imageUrls: ['https://placehold.co/600x600/png'],
  };
  const parse = (extra: object) => productCreateSchema.safeParse({ ...base, ...extra });

  it('produk tanpa varian tetap valid', () => {
    expect(parse({}).success).toBe(true);
  });

  it('varian tanpa opsi ditolak', () => {
    expect(parse({ variants: [{ values: ['Merah'], stock: 1 }] }).success).toBe(false);
  });

  it('kombinasi valid diterima', () => {
    expect(parse({
      options: OPTS,
      variants: [
        { values: ['Merah', 'S'], stock: 1 },
        { values: ['Biru', 'M'], stock: 2 },
      ],
    }).success).toBe(true);
  });

  it('kombinasi dengan jumlah nilai tidak sesuai opsi ditolak', () => {
    expect(parse({ options: OPTS, variants: [{ values: ['Merah'], stock: 1 }] }).success).toBe(false);
  });

  it('nilai di luar daftar opsi ditolak', () => {
    expect(parse({
      options: OPTS,
      variants: [{ values: ['Hijau', 'S'], stock: 1 }],
    }).success).toBe(false);
  });

  it('kombinasi kembar ditolak', () => {
    expect(parse({
      options: OPTS,
      variants: [
        { values: ['Merah', 'S'], stock: 1 },
        { values: ['Merah', 'S'], stock: 2 },
      ],
    }).success).toBe(false);
  });

  it('nama opsi kembar ditolak', () => {
    expect(parse({
      options: [{ name: 'Warna', values: ['A'] }, { name: 'warna', values: ['B'] }],
      variants: [{ values: ['A', 'B'], stock: 1 }],
    }).success).toBe(false);
  });

  it('nilai kembar dalam satu opsi ditolak', () => {
    expect(parse({
      options: [{ name: 'Warna', values: ['Merah', 'merah'] }],
      variants: [{ values: ['Merah'], stock: 1 }],
    }).success).toBe(false);
  });

  it('lebih dari 3 opsi ditolak', () => {
    expect(parse({
      options: [
        { name: 'A', values: ['1'] }, { name: 'B', values: ['2'] },
        { name: 'C', values: ['3'] }, { name: 'D', values: ['4'] },
      ],
    }).success).toBe(false);
  });

  it(`kombinasi melebihi ${MAX_VARIANT_COMBINATIONS} ditolak`, () => {
    // 6 x 9 = 54 > 50
    expect(parse({
      options: [
        { name: 'Warna', values: Array.from({ length: 6 }, (_, i) => `W${i}`) },
        { name: 'Ukuran', values: Array.from({ length: 9 }, (_, i) => `U${i}`) },
      ],
    }).success).toBe(false);
  });

  it('tepat di batas kombinasi diterima', () => {
    // 5 x 10 = 50
    expect(parse({
      options: [
        { name: 'Warna', values: Array.from({ length: 5 }, (_, i) => `W${i}`) },
        { name: 'Ukuran', values: Array.from({ length: 10 }, (_, i) => `U${i}`) },
      ],
    }).success).toBe(true);
  });
});

describe('variantLabel', () => {
  it('menurunkan label dari nilai option', () => {
    expect(variantLabel(['Merah', 'M'])).toBe('Merah / M');
    expect(variantLabel(['Bubuk Halus'])).toBe('Bubuk Halus');
  });

  it('jatuh ke `name` hanya kalau tautan nilainya belum ada (data belum di-backfill)', () => {
    expect(variantLabel([], 'Merah')).toBe('Merah');
    expect(variantLabel(undefined, 'Merah')).toBe('Merah');
    expect(variantLabel(null, 'Merah')).toBe('Merah');
  });

  it('nilai yang ada MENANG atas `name` yang basi', () => {
    // Inti perubahan M11-A8 tahap 4: kolom `name` cuma cache. Kalau isinya
    // berbeda dari nilai sesungguhnya, yang benar adalah nilainya.
    expect(variantLabel(['Merah', 'L'], 'Merah / M')).toBe('Merah / L');
  });

  it('tanpa nilai & tanpa name → string kosong, bukan "undefined"', () => {
    expect(variantLabel([], undefined)).toBe('');
    expect(variantLabel(null, null)).toBe('');
  });

  it('memangkas spasi seperti comboLabel', () => {
    expect(variantLabel([' Merah ', ' M '])).toBe('Merah / M');
    expect(variantLabel([], '  Merah  ')).toBe('Merah');
  });
});
