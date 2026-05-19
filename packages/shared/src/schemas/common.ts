import { z } from 'zod';

// HP Indonesia: +62 diikuti 8-12 digit, atau 08xx... yang otomatis dinormalisasi.
export const phoneSchema = z
  .string()
  .trim()
  .min(8, 'Nomor HP terlalu pendek')
  .max(16, 'Nomor HP terlalu panjang')
  .transform((val) => normalizePhone(val))
  .refine((val) => /^\+628\d{7,12}$/.test(val), {
    message: 'Format nomor HP tidak valid (contoh: 081234567890)',
  });

export function normalizePhone(input: string): string {
  const cleaned = input.replace(/[\s\-]/g, '');
  if (cleaned.startsWith('+62')) return cleaned;
  if (cleaned.startsWith('62')) return '+' + cleaned;
  if (cleaned.startsWith('0')) return '+62' + cleaned.slice(1);
  return cleaned;
}

export const passwordSchema = z
  .string()
  .min(6, 'Password minimal 6 karakter')
  .max(72, 'Password terlalu panjang');
