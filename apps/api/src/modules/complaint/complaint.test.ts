// Unit test aturan waktu komplain (M10-A7) — logic yang tidak bergantung DB.
import { describe, it, expect } from 'vitest';
import {
  isComplaintWindowOpen,
  canEscalateComplaint,
  complaintDeadline,
  createComplaintSchema,
  sellerRespondComplaintSchema,
  COMPLAINT_WINDOW_DAYS,
} from '@tokopudidi/shared';

const deliveredAt = new Date('2026-07-20T10:00:00.000Z');
const hariKe = (n: number) => new Date(deliveredAt.getTime() + n * 24 * 60 * 60 * 1000);

describe('jendela komplain', () => {
  it('deadline = deliveredAt + 2 hari', () => {
    expect(COMPLAINT_WINDOW_DAYS).toBe(2);
    expect(complaintDeadline(deliveredAt).toISOString()).toBe('2026-07-22T10:00:00.000Z');
  });

  it('terbuka di dalam jendela', () => {
    expect(isComplaintWindowOpen(deliveredAt, hariKe(1))).toBe(true);
  });

  it('tertutup tepat saat deadline', () => {
    expect(isComplaintWindowOpen(deliveredAt, hariKe(2))).toBe(false);
  });

  it('tertutup setelah lewat', () => {
    expect(isComplaintWindowOpen(deliveredAt, hariKe(3))).toBe(false);
  });

  it('tanpa deliveredAt dianggap tertutup', () => {
    expect(isComplaintWindowOpen(null)).toBe(false);
  });
});

describe('canEscalateComplaint', () => {
  const createdAt = new Date('2026-07-20T10:00:00.000Z');

  it('boleh setelah seller menolak', () => {
    expect(canEscalateComplaint({ status: 'SELLER_RESPONDED', createdAt }, createdAt)).toBe(true);
  });

  it('belum boleh selagi seller masih punya waktu menanggapi', () => {
    expect(canEscalateComplaint({ status: 'OPEN', createdAt }, hariKe(1))).toBe(false);
  });

  // Tanpa aturan ini komplain bisa menggantung selamanya kalau seller diam.
  it('boleh kalau seller diam melewati batas waktu', () => {
    expect(canEscalateComplaint({ status: 'OPEN', createdAt }, hariKe(2))).toBe(true);
  });

  it('tidak boleh untuk komplain yang sudah selesai', () => {
    expect(canEscalateComplaint({ status: 'RESOLVED', createdAt }, hariKe(5))).toBe(false);
    expect(canEscalateComplaint({ status: 'ESCALATED', createdAt }, hariKe(5))).toBe(false);
    expect(canEscalateComplaint({ status: 'REJECTED', createdAt }, hariKe(5))).toBe(false);
  });
});

describe('schema komplain', () => {
  const valid = {
    orderItemId: '11111111-1111-4111-8111-111111111111',
    type: 'BROKEN',
    resolutionType: 'REFUND',
    description: 'Layar retak saat paket dibuka.',
  };

  it('terima payload valid', () => {
    expect(createComplaintSchema.safeParse(valid).success).toBe(true);
  });

  it('tolak deskripsi terlalu pendek', () => {
    expect(createComplaintSchema.safeParse({ ...valid, description: 'rusak' }).success).toBe(false);
  });

  it('tolak bukti lebih dari 3 file', () => {
    const result = createComplaintSchema.safeParse({
      ...valid,
      evidenceUrls: ['aaaaa', 'bbbbb', 'ccccc', 'ddddd'],
    });
    expect(result.success).toBe(false);
  });

  it('tanggapan seller wajib berisi pesan', () => {
    expect(sellerRespondComplaintSchema.safeParse({ accept: true, message: 'ok' }).success).toBe(false);
    expect(sellerRespondComplaintSchema.safeParse({ accept: true, message: 'Baik, kami refund ya' }).success).toBe(true);
  });
});
