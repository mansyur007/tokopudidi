import { z } from 'zod';

// ===== Komplain / Return (M10-A7) =====

export const complaintTypeSchema = z.enum(['BROKEN', 'NOT_AS_DESCRIBED', 'MISSING_ITEM', 'OTHER']);
export type ComplaintTypeValue = z.infer<typeof complaintTypeSchema>;

export const complaintResolutionSchema = z.enum(['REFUND', 'REPLACEMENT']);
export type ComplaintResolutionValue = z.infer<typeof complaintResolutionSchema>;

export const complaintStatusValues = [
  'OPEN', 'SELLER_RESPONDED', 'ESCALATED', 'RESOLVED', 'REJECTED',
] as const;
export type ComplaintStatusValue = (typeof complaintStatusValues)[number];

export const COMPLAINT_TYPE_LABEL: Record<ComplaintTypeValue, string> = {
  BROKEN: 'Barang rusak / cacat',
  NOT_AS_DESCRIBED: 'Tidak sesuai deskripsi',
  MISSING_ITEM: 'Barang kurang / tidak lengkap',
  OTHER: 'Lainnya',
};

export const COMPLAINT_RESOLUTION_LABEL: Record<ComplaintResolutionValue, string> = {
  REFUND: 'Kembalikan dana',
  REPLACEMENT: 'Ganti barang',
};

export const COMPLAINT_STATUS_LABEL: Record<ComplaintStatusValue, string> = {
  OPEN: 'Menunggu respons penjual',
  SELLER_RESPONDED: 'Ditolak penjual',
  ESCALATED: 'Menunggu keputusan admin',
  RESOLVED: 'Selesai',
  REJECTED: 'Ditolak',
};

/** Buyer punya 2 hari sejak barang diterima untuk mengajukan komplain. */
export const COMPLAINT_WINDOW_DAYS = 2;

/**
 * Kalau seller diam selama ini, buyer boleh langsung naik ke admin — tanpa ini
 * komplain bisa menggantung selamanya di status OPEN.
 */
export const COMPLAINT_SELLER_RESPONSE_DAYS = 2;

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

export function complaintDeadline(deliveredAt: Date | string): Date {
  return addDays(new Date(deliveredAt), COMPLAINT_WINDOW_DAYS);
}

/** Masih dalam jendela pengajuan komplain? */
export function isComplaintWindowOpen(
  deliveredAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!deliveredAt) return false;
  return now < complaintDeadline(deliveredAt);
}

/** Buyer boleh naik banding ke admin? */
export function canEscalateComplaint(
  complaint: { status: ComplaintStatusValue; createdAt: Date | string },
  now: Date = new Date(),
): boolean {
  if (complaint.status === 'SELLER_RESPONDED') return true;
  // Seller tidak merespons dalam batas waktu.
  return (
    complaint.status === 'OPEN' &&
    now >= addDays(new Date(complaint.createdAt), COMPLAINT_SELLER_RESPONSE_DAYS)
  );
}

export const createComplaintSchema = z.object({
  orderItemId: z.string().uuid('Pilih barang yang dikomplain'),
  type: complaintTypeSchema,
  resolutionType: complaintResolutionSchema,
  description: z.string().trim().min(10, 'Ceritakan masalahnya minimal 10 karakter').max(1000),
  evidenceUrls: z.array(z.string().min(5)).max(3, 'Maksimal 3 file bukti').optional(),
});
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const sellerRespondComplaintSchema = z.object({
  accept: z.boolean(),
  message: z.string().trim().min(5, 'Tulis tanggapan minimal 5 karakter').max(1000),
});
export type SellerRespondComplaintInput = z.infer<typeof sellerRespondComplaintSchema>;

export const decideComplaintSchema = z.object({
  outcome: z.enum(['RESOLVED', 'REJECTED']),
  note: z.string().trim().max(500).optional().or(z.literal('')),
});
export type DecideComplaintInput = z.infer<typeof decideComplaintSchema>;
