import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { prisma, User } from '@tokopudidi/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../lib/errors';
import type { UserPublic, AuthTokens } from '@tokopudidi/shared';

const BCRYPT_COST = 12;
const REFRESH_TTL_DAYS = 7;

export function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isPhoneVerified: user.isPhoneVerified,
    avatarUrl: user.avatarUrl,
    referralCode: user.referralCode,
  };
}

function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

async function uniqueReferralCode(): Promise<string> {
  // Loop kecil — kemungkinan tabrakan sangat rendah.
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    const exists = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
  }
  throw new Error('Gagal generate referral code unik');
}

export async function registerUser(input: {
  phone: string;
  password: string;
  fullName: string;
  referralCode?: string;
}): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (existing) {
    throw new ConflictError('Nomor HP ini sudah pernah didaftarkan');
  }

  let referredById: string | undefined;
  if (input.referralCode && input.referralCode.length === 8) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: input.referralCode },
    });
    if (referrer) referredById = referrer.id;
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const referralCode = await uniqueReferralCode();

  const user = await prisma.user.create({
    data: {
      phone: input.phone,
      passwordHash,
      fullName: input.fullName,
      referralCode,
      referredById,
      cart: { create: {} }, // setiap user dapat 1 cart kosong
    },
  });

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), tokens };
}

export async function loginUser(phone: string, password: string): Promise<{
  user: UserPublic;
  tokens: AuthTokens;
}> {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || user.deletedAt) {
    throw new UnauthorizedError('Nomor HP atau password salah');
  }
  if (user.isSuspended) {
    throw new UnauthorizedError('Akun kamu sedang ditangguhkan. Hubungi admin ya.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Nomor HP atau password salah');
  }

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), tokens };
}

async function issueTokens(user: User): Promise<AuthTokens> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role });

  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt },
  });

  return { accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Refresh token tidak valid');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Sesi sudah berakhir, login ulang ya');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new NotFoundError('User tidak ditemukan');

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({
    where: { token: refreshToken },
    data: { revokedAt: new Date() },
  });

  return issueTokens(user);
}

export async function logoutUser(refreshToken: string): Promise<void> {
  await prisma.refreshToken
    .updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined);
}

export async function resetPassword(phone: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new NotFoundError('Nomor HP belum terdaftar');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  // Revoke semua refresh token — paksa login ulang di semua device.
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
