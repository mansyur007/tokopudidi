import { z } from 'zod';

// Flash sale terjadwal (M15-C1) — event dikurasi admin, berisi slot produk
// dengan harga khusus + kuota.

const flashSaleBase = z.object({
  name: z.string().trim().min(3, 'Nama event minimal 3 karakter').max(60),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  isActive: z.boolean().default(true),
});

export const flashSaleCreateSchema = flashSaleBase.refine(
  (v) => new Date(v.endAt) > new Date(v.startAt),
  { message: 'Waktu berakhir harus setelah waktu mulai', path: ['endAt'] },
);
export type FlashSaleCreateInput = z.infer<typeof flashSaleCreateSchema>;

/**
 * Update parsial. Perbandingan mulai-vs-berakhir sengaja TIDAK di-refine di
 * sini: kalau yang dikirim cuma salah satunya, pembandingnya ada di baris DB —
 * jadi route yang memeriksanya setelah menggabungkan nilai lama & baru.
 */
export const flashSaleUpdateSchema = flashSaleBase.partial();
export type FlashSaleUpdateInput = z.infer<typeof flashSaleUpdateSchema>;

export const flashSaleItemCreateSchema = z.object({
  productId: z.string().uuid(),
  // Batas bawah sama dengan harga produk (M14-B2) supaya "gratis" tidak bisa
  // lolos lewat pintu flash sale.
  salePrice: z.number().int().min(100, 'Harga flash minimal Rp 100'),
  quota: z.number().int().min(1, 'Kuota minimal 1').max(100_000),
});
export type FlashSaleItemCreateInput = z.infer<typeof flashSaleItemCreateSchema>;

export const flashSaleItemUpdateSchema = flashSaleItemCreateSchema
  .omit({ productId: true })
  .partial()
  .refine((v) => v.salePrice !== undefined || v.quota !== undefined, {
    message: 'Tidak ada yang diubah',
  });
export type FlashSaleItemUpdateInput = z.infer<typeof flashSaleItemUpdateSchema>;
