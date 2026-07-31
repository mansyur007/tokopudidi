// Aturan ketersediaan invoice (M13-A2). Diuji di workspace api karena hanya
// di sini Vitest berjalan; fungsinya sendiri hidup di packages/shared supaya
// tombol di detail pesanan dan guard halaman invoice memakai daftar yang sama.
import { describe, it, expect } from 'vitest';
import { canViewInvoice, invoiceNumber, INVOICE_STATUSES } from '@tokopudidi/shared';

// Seluruh nilai enum OrderStatus di schema.prisma — kalau ada status baru
// ditambahkan tanpa memutuskan posisinya di sini, test ini yang jadi pengingat.
const SEMUA_STATUS = [
  'PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED',
  'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'EXPIRED',
] as const;

describe('canViewInvoice', () => {
  it('mengizinkan status yang uangnya sudah masuk', () => {
    for (const s of ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED']) {
      expect(canViewInvoice(s), s).toBe(true);
    }
  });

  it('menolak pesanan yang belum dibayar, batal, kedaluwarsa, atau sudah direfund', () => {
    for (const s of ['PENDING_PAYMENT', 'CANCELLED', 'EXPIRED', 'REFUNDED']) {
      expect(canViewInvoice(s), s).toBe(false);
    }
  });

  it('tiap status pesanan punya keputusan, tidak ada yang tercecer', () => {
    const diizinkan = SEMUA_STATUS.filter(canViewInvoice);
    expect([...diizinkan].sort()).toEqual([...INVOICE_STATUSES].sort());
  });

  it('nilai kosong / tidak dikenal ditolak, bukan dianggap boleh', () => {
    expect(canViewInvoice(null)).toBe(false);
    expect(canViewInvoice(undefined)).toBe(false);
    expect(canViewInvoice('')).toBe(false);
    expect(canViewInvoice('LUNAS')).toBe(false);
    // Bukan pencocokan longgar: substring dari status sah tetap ditolak.
    expect(canViewInvoice('PAI')).toBe(false);
  });
});

describe('invoiceNumber', () => {
  it('diturunkan dari nomor pesanan', () => {
    expect(invoiceNumber('TKP-20260731-0001')).toBe('INV/TKP-20260731-0001');
  });
});
