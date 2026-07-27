// Unit test parsing query filter pencarian (M10-A10) — logic yang tidak bergantung DB.
import { describe, it, expect } from 'vitest';
import { productListQuerySchema } from '@tokopudidi/shared';

describe('productListQuerySchema — filter lokasi', () => {
  it('pecah cities comma-separated jadi array', () => {
    const q = productListQuerySchema.parse({ cities: 'Bandung,Surabaya' });
    expect(q.cities).toEqual(['Bandung', 'Surabaya']);
  });

  it('rapikan spasi dan buang entri kosong', () => {
    const q = productListQuerySchema.parse({ cities: ' Bandung , ,Surabaya, ' });
    expect(q.cities).toEqual(['Bandung', 'Surabaya']);
  });

  it('cities kosong dianggap tidak difilter', () => {
    expect(productListQuerySchema.parse({ cities: '' }).cities).toBeUndefined();
    expect(productListQuerySchema.parse({}).cities).toBeUndefined();
  });
});

describe('productListQuerySchema — filter boolean', () => {
  it('"true" dan "1" menyalakan filter', () => {
    expect(productListQuerySchema.parse({ freeShipping: 'true' }).freeShipping).toBe(true);
    expect(productListQuerySchema.parse({ cod: '1' }).cod).toBe(true);
  });

  // Jebakan z.coerce.boolean(): Boolean('false') bernilai true.
  it('"false" tidak menyalakan filter', () => {
    expect(productListQuerySchema.parse({ officialStoreOnly: 'false' }).officialStoreOnly).toBe(false);
  });

  it('parameter yang tidak dikirim tetap undefined', () => {
    expect(productListQuerySchema.parse({}).freeShipping).toBeUndefined();
  });
});

describe('productListQuerySchema — rentang & default', () => {
  it('coerce angka dari query string', () => {
    const q = productListQuerySchema.parse({ minPrice: '10000', maxPrice: '50000', minRating: '4' });
    expect(q.minPrice).toBe(10000);
    expect(q.maxPrice).toBe(50000);
    expect(q.minRating).toBe(4);
  });

  it('tolak rating di luar 1–5', () => {
    expect(productListQuerySchema.safeParse({ minRating: '6' }).success).toBe(false);
  });

  it('default sort, page, limit', () => {
    const q = productListQuerySchema.parse({});
    expect(q).toMatchObject({ sort: 'relevance', page: 1, limit: 20 });
  });
});
