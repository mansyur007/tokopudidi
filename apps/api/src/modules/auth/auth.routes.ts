import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import {
  registerSchema,
  loginSchema,
  otpSendSchema,
  otpVerifySchema,
  refreshSchema,
  forgotPasswordSchema,
} from '@tokopudidi/shared';
import { validateBody } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { loginLimiter, otpLimiter } from '../../middleware/rateLimit';
import { ok, created } from '../../lib/response';
import { BadRequestError, NotFoundError } from '../../lib/errors';
import { sendOtp, verifyOtp } from './otp.service';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  resetPassword,
  toPublicUser,
} from './auth.service';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    return created(res, result, 'Pendaftaran berhasil! Selamat datang di Tokopudidi.');
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', loginLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const result = await loginUser(phone, password);
    return ok(res, result, 'Berhasil masuk');
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', validateBody(refreshSchema), async (req, res, next) => {
  try {
    const tokens = await refreshAccessToken(req.body.refreshToken);
    return ok(res, tokens);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken as string | undefined;
    if (refreshToken) await logoutUser(refreshToken);
    return ok(res, null, 'Sampai jumpa lagi!');
  } catch (err) {
    next(err);
  }
});

authRouter.post('/otp/send', otpLimiter, validateBody(otpSendSchema), async (req, res, next) => {
  try {
    await sendOtp(req.body.phone, req.body.purpose);
    return ok(res, null, 'Kode OTP sudah dikirim ke HP kamu');
  } catch (err) {
    next(err);
  }
});

authRouter.post('/otp/verify', validateBody(otpVerifySchema), async (req, res, next) => {
  try {
    const valid = await verifyOtp(req.body.phone, req.body.code, req.body.purpose);
    if (!valid) throw new BadRequestError('Kode OTP salah atau sudah kadaluarsa');

    // Untuk REGISTER/LOGIN, mark phone sebagai terverifikasi.
    if (req.body.purpose === 'REGISTER' || req.body.purpose === 'LOGIN') {
      await prisma.user.updateMany({
        where: { phone: req.body.phone },
        data: { isPhoneVerified: true },
      });
    }
    return ok(res, { verified: true }, 'Nomor HP berhasil diverifikasi');
  } catch (err) {
    next(err);
  }
});

authRouter.post('/forgot-password', validateBody(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { phone, code, newPassword } = req.body;
    const valid = await verifyOtp(phone, code, 'RESET_PASSWORD');
    if (!valid) throw new BadRequestError('Kode OTP salah atau sudah kadaluarsa');
    await resetPassword(phone, newPassword);
    return ok(res, null, 'Password berhasil diganti, silakan login lagi');
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new NotFoundError('User tidak ditemukan');
    return ok(res, toPublicUser(user));
  } catch (err) {
    next(err);
  }
});
