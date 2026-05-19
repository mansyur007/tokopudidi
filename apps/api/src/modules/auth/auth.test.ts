// Unit test untuk helper auth — fokus pada logic yang tidak bergantung DB.
import { describe, it, expect } from 'vitest';
import { normalizePhone, registerSchema, loginSchema } from '@tokopudidi/shared';

describe('normalizePhone', () => {
  it('normalize 08xx menjadi +628xx', () => {
    expect(normalizePhone('081234567890')).toBe('+6281234567890');
  });
  it('biarkan +62 apa adanya', () => {
    expect(normalizePhone('+6281234567890')).toBe('+6281234567890');
  });
  it('tambah + jika diawali 62', () => {
    expect(normalizePhone('6281234567890')).toBe('+6281234567890');
  });
});

describe('registerSchema', () => {
  it('parse data valid', () => {
    const result = registerSchema.safeParse({
      phone: '081234567890',
      password: 'rahasia123',
      fullName: 'Budi Santoso',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+6281234567890');
    }
  });

  it('tolak password pendek', () => {
    const result = registerSchema.safeParse({
      phone: '081234567890',
      password: '123',
      fullName: 'Budi',
    });
    expect(result.success).toBe(false);
  });

  it('tolak HP tidak valid', () => {
    const result = registerSchema.safeParse({
      phone: '999',
      password: 'rahasia123',
      fullName: 'Budi',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('terima HP dan password valid', () => {
    const result = loginSchema.safeParse({
      phone: '+6281234567890',
      password: 'rahasia123',
    });
    expect(result.success).toBe(true);
  });
});
