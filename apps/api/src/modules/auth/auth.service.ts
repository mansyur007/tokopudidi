import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { prisma, User } from '@tokopudidi/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../lib/errors';
import type { UserPublic, AuthTokens } from '@tokopudidi/shared';
import { notifyWelcome } from '../../lib/emailEvents';

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
  email?: string;
  referralCode?: string;
}): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (existing) {
    throw new ConflictError('Nomor HP ini sudah pernah didaftarkan');
  }

  // Kolom email unique: string kosong dari form harus jadi `undefined`, bukan
  // '' — dua akun tanpa email akan bertabrakan pada '' yang kedua.
  const email = input.email?.trim() ? input.email.trim().toLowerCase() : undefined;
  if (email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) throw new ConflictError('Email ini sudah dipakai akun lain');
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
      email,
      passwordHash,
      fullName: input.fullName,
      referralCode,
      referredById,
      cart: { create: {} }, // setiap user dapat 1 cart kosong
    },
  });

  // M14-A2 — welcome email hanya kalau memang ada alamatnya. Tidak di-`await`:
  // pendaftaran sudah berhasil sebelum email jadi urusan siapa pun.
  void notifyWelcome(user.email, user.fullName);

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), tokens };
}

/**
 * Ubah email akun sendiri. Satu-satunya jalur pengisian `User.email` bagi user
 * yang sudah terdaftar — register hanya melayani akun baru.
 *
 * String kosong berarti **menghapus** email (berhenti berlangganan email
 * transaksional), bukan menyimpan ''. Kolomnya unique: '' yang kedua akan
 * ditolak database dan user kedua tidak akan pernah tahu kenapa.
 */
export async function updateOwnProfile(
  userId: string,
  input: { email?: string },
): Promise<UserPublic> {
  const email = input.email?.trim() ? input.email.trim().toLowerCase() : null;

  if (email) {
    const taken = await prisma.user.findFirst({
      where: { email, id: { not: userId } },
      select: { id: true },
    });
    if (taken) throw new ConflictError('Email ini sudah dipakai akun lain');
  }

  const sebelum = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const user = await prisma.user.update({ where: { id: userId }, data: { email } });

  // Welcome dikirim saat email *pertama kali* terpasang di akun yang tadinya
  // tanpa email — bukan tiap kali disimpan ulang, dan bukan saat dihapus.
  if (email && sebelum?.email !== email) void notifyWelcome(email, user.fullName);

  return toPublicUser(user);
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
