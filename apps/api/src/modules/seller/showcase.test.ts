// Unit test etalase toko (M11-B1) — logic yang tidak bergantung DB.
import { describe, it, expect } from 'vitest';
import {
  showcaseCreateSchema,
  showcaseAssignProductsSchema,
  showcaseMoveSchema,
  MAX_PRODUCTS_PER_SHOWCASE,
} from '@tokopudidi/shared';
import { swapAndNormalize } from './showcase.order';

const rows = (...ids: string[]) => ids.map((id, i) => ({ id, order: i }));
const idsOf = (out: { id: string; order: number }[] | null) => out?.map((r) => r.id);

describe('swapAndNormalize', () => {
  it('naikkan satu posisi', () => {
    const out = swapAndNormalize(rows('a', 'b', 'c'), 'b', 'up');
    expect(idsOf(out)).toEqual(['b', 'a', 'c']);
  });

  it('turunkan satu posisi', () => {
    const out = swapAndNormalize(rows('a', 'b', 'c'), 'b', 'down');
    expect(idsOf(out)).toEqual(['a', 'c', 'b']);
  });

  it('order hasil selalu 0..n-1 berurutan', () => {
    const out = swapAndNormalize(rows('a', 'b', 'c'), 'c', 'up');
    expect(out?.map((r) => r.order)).toEqual([0, 1, 2]);
  });

  it('di ujung atas tidak berubah', () => {
    expect(swapAndNormalize(rows('a', 'b'), 'a', 'up')).toBeNull();
  });

  it('di ujung bawah tidak berubah', () => {
    expect(swapAndNormalize(rows('a', 'b'), 'b', 'down')).toBeNull();
  });

  it('id yang tidak ada tidak mengubah apa pun', () => {
    expect(swapAndNormalize(rows('a', 'b'), 'zzz', 'up')).toBeNull();
  });

  // Ini alasan normalisasi ada: swap yang cuma menukar dua nilai `order` akan
  // diam-diam gagal kalau nilainya kebetulan kembar.
  it('tetap benar walau order di DB kembar', () => {
    const kembar = [
      { id: 'a', order: 0 },
      { id: 'b', order: 0 },
      { id: 'c', order: 0 },
    ];
    const out = swapAndNormalize(kembar, 'c', 'up');
    expect(idsOf(out)).toEqual(['a', 'c', 'b']);
    expect(out?.map((r) => r.order)).toEqual([0, 1, 2]);
  });

  it('order bolong ikut dirapikan', () => {
    const bolong = [
      { id: 'a', order: 3 },
      { id: 'b', order: 9 },
    ];
    const out = swapAndNormalize(bolong, 'b', 'up');
    expect(out).toEqual([{ id: 'b', order: 0 }, { id: 'a', order: 1 }]);
  });

  it('satu-satunya etalase tidak bisa dipindah ke mana pun', () => {
    expect(swapAndNormalize(rows('a'), 'a', 'up')).toBeNull();
    expect(swapAndNormalize(rows('a'), 'a', 'down')).toBeNull();
  });
});

describe('showcaseCreateSchema', () => {
  it('terima nama wajar', () => {
    expect(showcaseCreateSchema.safeParse({ name: 'Best Seller' }).success).toBe(true);
  });

  it('tolak nama terlalu pendek', () => {
    expect(showcaseCreateSchema.safeParse({ name: 'a' }).success).toBe(false);
  });

  it('tolak nama yang cuma spasi', () => {
    expect(showcaseCreateSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('rapikan spasi di ujung', () => {
    const parsed = showcaseCreateSchema.parse({ name: '  Diskon  ' });
    expect(parsed.name).toBe('Diskon');
  });
});

describe('showcaseAssignProductsSchema', () => {
  const uuid = (n: number) => `1111111${n}-1111-4111-8111-111111111111`;

  it('array kosong valid — artinya kosongkan etalase', () => {
    expect(showcaseAssignProductsSchema.safeParse({ productIds: [] }).success).toBe(true);
  });

  it('tolak id yang bukan uuid', () => {
    expect(showcaseAssignProductsSchema.safeParse({ productIds: ['bukan-uuid'] }).success).toBe(false);
  });

  it(`tolak lebih dari ${MAX_PRODUCTS_PER_SHOWCASE} produk`, () => {
    const tooMany = Array.from({ length: MAX_PRODUCTS_PER_SHOWCASE + 1 }, (_, i) => uuid(i % 10));
    expect(showcaseAssignProductsSchema.safeParse({ productIds: tooMany }).success).toBe(false);
  });

  it(`terima tepat ${MAX_PRODUCTS_PER_SHOWCASE} produk`, () => {
    const exact = Array.from({ length: MAX_PRODUCTS_PER_SHOWCASE }, (_, i) => uuid(i % 10));
    expect(showcaseAssignProductsSchema.safeParse({ productIds: exact }).success).toBe(true);
  });
});

describe('showcaseMoveSchema', () => {
  it('hanya menerima up / down', () => {
    expect(showcaseMoveSchema.safeParse({ direction: 'up' }).success).toBe(true);
    expect(showcaseMoveSchema.safeParse({ direction: 'down' }).success).toBe(true);
    expect(showcaseMoveSchema.safeParse({ direction: 'kiri' }).success).toBe(false);
  });
});
