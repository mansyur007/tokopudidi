import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Sabar dulu ya, terlalu banyak percobaan login' },
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.body?.phone as string) ?? req.ip ?? 'unknown',
  message: { success: false, message: 'Terlalu banyak permintaan OTP, coba lagi 1 jam lagi' },
});

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
