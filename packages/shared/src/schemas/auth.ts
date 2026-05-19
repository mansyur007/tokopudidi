import { z } from 'zod';
import { phoneSchema, passwordSchema } from './common';

export const registerSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80),
  referralCode: z.string().trim().toUpperCase().length(8).optional().or(z.literal('')),
});
export type RegisterInput = z.infer<typeof registerSchema>;

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
