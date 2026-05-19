import { z } from 'zod';

export const shippingMethodSchema = z.enum(['REGULAR', 'SAME_DAY', 'PICKUP_SENDIRI']);
export const paymentMethodSchema = z.enum(['COD', 'TRANSFER_MANUAL', 'QRIS_MOCK']);

// Per toko: kurir & catatan opsional.
export const checkoutShopSchema = z.object({
  shopId: z.string().uuid(),
  // ID item keranjang yang dipilih untuk toko ini.
  cartItemIds: z.array(z.string().uuid()).min(1, 'Pilih minimal 1 produk per toko'),
  shippingMethod: shippingMethodSchema,
  notes: z.string().trim().max(200).optional().or(z.literal('')),
});
export type CheckoutShopInput = z.infer<typeof checkoutShopSchema>;

export const checkoutSchema = z.object({
  addressId: z.string().uuid().optional(),  // wajib kecuali semua PICKUP_SENDIRI
  shops: z.array(checkoutShopSchema).min(1, 'Pilih minimal 1 toko'),
  paymentMethod: paymentMethodSchema,
  promoCode: z.string().trim().toUpperCase().optional().or(z.literal('')),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3, 'Alasan minimal 3 karakter').max(200),
});

export const uploadProofSchema = z.object({
  bankName: z.string().trim().min(2).max(40),
  accountName: z.string().trim().min(2).max(80),
  transferAmount: z.coerce.number().int().min(1),
  // proofImageUrl di-set oleh server setelah upload — tapi untuk mock,
  // kita izinkan client kirim langsung URL atau data URL.
  proofImageUrl: z.string().min(5),
});
