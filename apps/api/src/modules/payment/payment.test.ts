// Unit test QRIS mock (M10-A5) — fokus pada logic batas waktu & payload QR,
// bagian yang tidak bergantung DB.
import { describe, it, expect } from 'vitest';
import { QRIS_EXPIRY_MINUTES, qrisExpiresAt, generateQrisPayment } from './payment.service';

const order = {
  orderNumber: 'TKP-20260726-12345',
  total: 150_000,
  createdAt: new Date('2026-07-26T10:00:00.000Z'),
};

describe('qrisExpiresAt', () => {
  it('batas waktu = createdAt + 15 menit', () => {
    expect(QRIS_EXPIRY_MINUTES).toBe(15);
    expect(qrisExpiresAt(order.createdAt).toISOString()).toBe('2026-07-26T10:15:00.000Z');
  });
});

describe('generateQrisPayment', () => {
  it('kirim nominal, batas waktu, dan QR sebagai data URI PNG', async () => {
    const qris = await generateQrisPayment(order, new Date('2026-07-26T10:05:00.000Z'));
    expect(qris.amount).toBe(150_000);
    expect(qris.expiresAt).toBe('2026-07-26T10:15:00.000Z');
    expect(qris.qrImageDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(qris.qrString).toContain(order.orderNumber);
  });

  it('belum expired tepat sebelum batas waktu', async () => {
    const qris = await generateQrisPayment(order, new Date('2026-07-26T10:14:59.000Z'));
    expect(qris.expired).toBe(false);
  });

  it('expired tepat saat batas waktu tercapai', async () => {
    const qris = await generateQrisPayment(order, new Date('2026-07-26T10:15:00.000Z'));
    expect(qris.expired).toBe(true);
  });
});
