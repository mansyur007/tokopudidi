import { z } from 'zod';

// ===== Report / Pelaporan (M8-C2) =====

export const reportTargetTypeSchema = z.enum(['PRODUCT', 'REVIEW', 'SHOP', 'DISCUSSION', 'USER']);
export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;

// 5 alasan baku — picker di UI, disimpan sebagai string supaya fleksibel.
export const REPORT_REASONS = [
  'Produk palsu / melanggar hak cipta',
  'Konten tidak pantas / SARA',
  'Penipuan / harga menyesatkan',
  'Barang terlarang / berbahaya',
  'Spam / penyalahgunaan platform',
] as const;

export const createReportSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.string().uuid('Target laporan tidak valid'),
  reason: z.string().trim().min(3, 'Pilih alasan dulu').max(120),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  evidenceUrls: z.array(z.string().min(5)).max(3, 'Maksimal 3 file bukti').optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const resolveReportSchema = z.object({
  action: z.enum(['ACTIONED', 'DISMISSED']),
  note: z.string().trim().max(300).optional().or(z.literal('')),
});
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
