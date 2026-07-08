import { z } from 'zod';

export const upgradeToSellerSchema = z.object({
  shopName: z.string().trim().min(3, 'Nama toko minimal 3 karakter').max(30),
  shopDescription: z.string().trim().max(500).optional().or(z.literal('')),
  province: z.string().trim().min(1, 'Provinsi wajib diisi'),
  city: z.string().trim().min(1, 'Kota wajib diisi'),
  ktpUrl: z.string().min(5, 'Foto KTP wajib diupload'),
  agreeTerms: z.boolean().refine((v) => v === true, { message: 'Setujui syarat & ketentuan dulu ya' }),
});
export type UpgradeToSellerInput = z.infer<typeof upgradeToSellerSchema>;

export const updateShopSchema = z.object({
  name: z.string().trim().min(3).max(30).optional(),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  logoUrl: z.string().min(5).optional().or(z.literal('')),
  bannerUrl: z.string().min(5).optional().or(z.literal('')),
  isOpen: z.boolean().optional(),
  closedReason: z.string().trim().max(200).optional().or(z.literal('')),
  bankName: z.string().trim().max(40).optional().or(z.literal('')),
  bankAccountNo: z.string().trim().max(40).optional().or(z.literal('')),
  bankAccountName: z.string().trim().max(80).optional().or(z.literal('')),
  autoReplyText: z.string().trim().max(300).optional().or(z.literal('')),
});

const variantInput = z.object({
  id: z.string().uuid().optional(),     // ada kalau edit
  name: z.string().trim().min(1).max(40),
  priceModifier: z.number().int().default(0),
  stock: z.number().int().min(0),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(3, 'Nama produk minimal 3 karakter').max(120),
  description: z.string().trim().min(10, 'Deskripsi minimal 10 karakter').max(5000),
  categoryId: z.string().uuid('Pilih kategori dulu'),
  price: z.number().int().min(100, 'Harga minimal Rp 100'),
  stock: z.number().int().min(0),
  minOrderQty: z.number().int().min(1).default(1),
  weight: z.number().int().min(1, 'Berat minimal 1 gram'),
  condition: z.enum(['NEW', 'USED']).default('NEW'),
  isActive: z.boolean().default(true),
  imageUrls: z.array(z.string().min(5)).min(1, 'Minimal 1 foto produk').max(5, 'Maksimal 5 foto'),
  variants: z.array(variantInput).max(20).optional(),
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema.partial();

export const shipOrderSchema = z.object({
  trackingNumber: z.string().trim().min(3, 'Nomor resi minimal 3 karakter').max(60),
  courierName: z.string().trim().min(2, 'Pilih kurir dulu').max(40),
});

export const rejectOrderSchema = z.object({
  reason: z.string().trim().min(3).max(200),
});

export const verifyPaymentSchema = z.object({
  approved: z.boolean(),
  rejectReason: z.string().trim().max(200).optional().or(z.literal('')),
});

export const withdrawSchema = z.object({
  amount: z.number().int().min(10000, 'Minimal tarik dana Rp 10.000'),
});

// ===== Voucher (M9-B2 seller / M9-C1 admin) =====
export const voucherCreateSchema = z.object({
  code: z.string().trim().toUpperCase()
    .min(3, 'Kode minimal 3 karakter').max(20)
    .regex(/^[A-Z0-9]+$/, 'Kode hanya huruf & angka'),
  discountType: z.enum(['FIXED', 'PERCENTAGE']),
  discountValue: z.number().int().min(1, 'Nilai diskon minimal 1'),
  minPurchase: z.number().int().min(0).default(0),
  maxDiscount: z.number().int().min(1).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
}).refine((v) => new Date(v.validFrom) < new Date(v.validUntil), {
  message: 'Tanggal berakhir harus setelah tanggal mulai',
  path: ['validUntil'],
}).refine((v) => v.discountType !== 'PERCENTAGE' || v.discountValue <= 100, {
  message: 'Diskon persen maksimal 100%',
  path: ['discountValue'],
});
export type VoucherCreateInput = z.infer<typeof voucherCreateSchema>;

export const voucherUpdateSchema = z.object({
  discountType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
  discountValue: z.number().int().min(1).optional(),
  minPurchase: z.number().int().min(0).optional(),
  maxDiscount: z.number().int().min(1).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  isActive: z.boolean().optional(), // pause / resume
});
export type VoucherUpdateInput = z.infer<typeof voucherUpdateSchema>;

// ===== Template chat seller (M8-B6) =====
export const chatTemplateSchema = z.object({
  label: z.string().trim().min(2, 'Label minimal 2 karakter').max(40),
  body: z.string().trim().min(2, 'Isi template minimal 2 karakter').max(500),
  order: z.number().int().min(0).default(0),
});
export type ChatTemplateInput = z.infer<typeof chatTemplateSchema>;

export const chatTemplateUpdateSchema = chatTemplateSchema.partial();
