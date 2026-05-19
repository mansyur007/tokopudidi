import { z } from 'zod';
import { phoneSchema } from './common';

export const addressInputSchema = z.object({
  label: z.string().trim().min(1, 'Label alamat wajib diisi').max(30),
  recipientName: z.string().trim().min(2, 'Nama penerima minimal 2 karakter').max(80),
  recipientPhone: phoneSchema,
  province: z.string().trim().min(1, 'Provinsi wajib diisi'),
  city: z.string().trim().min(1, 'Kota wajib diisi'),
  district: z.string().trim().min(1, 'Kecamatan wajib diisi'),
  subdistrict: z.string().trim().min(1, 'Kelurahan wajib diisi'),
  postalCode: z.string().trim().regex(/^\d{5}$/, 'Kode pos harus 5 digit'),
  fullAddress: z.string().trim().min(5, 'Alamat lengkap minimal 5 karakter').max(500),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressInputSchema>;
