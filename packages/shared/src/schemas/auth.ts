import { z } from 'zod';
import { phoneSchema, passwordSchema } from './common';

/**
 * Email opsional. Identitas utama tetap **phone** (M14-A1 mencatat alasannya),
 * jadi email di sini murni alamat surat: dinormalkan huruf kecil supaya
 * "Budi@x.com" dan "budi@x.com" tidak menempati dua baris berbeda pada kolom
 * yang unique.
 */
export const emailOptionalSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Format email tidak valid')
  .max(120)
  .optional()
  .or(z.literal(''));

export const registerSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80),
  email: emailOptionalSchema,
  referralCode: z.string().trim().toUpperCase().length(8).optional().or(z.literal('')),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Ubah profil sendiri. Untuk sekarang hanya email — tanpa endpoint ini,
 * `User.email` tidak punya satu pun jalur pengisian bagi user yang sudah
 * terdaftar, dan seluruh email transaksional (M14-A2) tidak akan pernah punya
 * tujuan kirim.
 */
export const updateProfileSchema = z.object({
  email: emailOptionalSchema,
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const loginSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const otpSendSchema = z.object({
  phone: phoneSchema,
  purpose: z.enum(['REGISTER', 'LOGIN', 'RESET_PASSWORD']),
});
export type OtpSendInput = z.infer<typeof otpSendSchema>;

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, 'Kode OTP harus 6 digit'),
  purpose: z.enum(['REGISTER', 'LOGIN', 'RESET_PASSWORD']),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const forgotPasswordSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6),
  newPassword: passwordSchema,
});
