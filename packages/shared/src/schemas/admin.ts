import { z } from 'zod';

// ===== Moderasi user & toko =====
export const suspendSchema = z.object({
  reason: z.string().trim().min(3, 'Alasan minimal 3 karakter').max(200),
});
export type SuspendInput = z.infer<typeof suspendSchema>;

// ===== Refund (admin arbitrase) =====
export const resolveRefundSchema = z.object({
  approved: z.boolean(),
  adminNote: z.string().trim().max(300).optional().or(z.literal('')),
});
export type ResolveRefundInput = z.infer<typeof resolveRefundSchema>;

// ===== Refund (buyer ajukan) =====
export const requestRefundSchema = z.object({
  reason: z.string().trim().min(10, 'Ceritakan masalahnya minimal 10 karakter').max(500),
  evidenceImages: z.array(z.string().min(5)).max(3, 'Maksimal 3 foto bukti').optional(),
});
export type RequestRefundInput = z.infer<typeof requestRefundSchema>;

// ===== Banner CRUD =====
export const bannerCreateSchema = z.object({
  imageUrl: z.string().min(5, 'Gambar banner wajib diisi'),
  linkUrl: z.string().trim().max(300).optional().or(z.literal('')),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  placement: z.enum(['HOME_TOP', 'HOME_MIDDLE', 'CATEGORY_PAGE']).default('HOME_TOP'),
  validFrom: z.string().datetime().optional().or(z.literal('')),
  validUntil: z.string().datetime().optional().or(z.literal('')),
});
export type BannerCreateInput = z.infer<typeof bannerCreateSchema>;

export const bannerUpdateSchema = bannerCreateSchema.partial();

// ===== Category CRUD =====
export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2, 'Nama kategori minimal 2 karakter').max(40),
  parentId: z.string().uuid().optional().or(z.literal('')),
  iconUrl: z.string().trim().max(300).optional().or(z.literal('')),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const categoryUpdateSchema = categoryCreateSchema.partial();
