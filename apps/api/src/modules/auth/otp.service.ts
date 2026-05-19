// Mock OTP service: print OTP ke console di dev, simpan ke DB.
// Adapter pattern — siap diganti dengan Twilio/Vonage di production.
import { prisma } from '@tokopudidi/database';
import { logger } from '../../lib/logger';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 menit

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export interface OtpProvider {
  send(phone: string, code: string, purpose: string): Promise<void>;
}

class MockOtpProvider implements OtpProvider {
  async send(phone: string, code: string, purpose: string): Promise<void> {
    logger.info({ phone, code, purpose }, '📱 [MOCK OTP] Kirim kode');
    console.log(`\n📱 OTP untuk ${phone} (${purpose}): ${code}\n`);
  }
}

const provider: OtpProvider = new MockOtpProvider();

export async function sendOtp(phone: string, purpose: string): Promise<void> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.otpCode.create({
    data: { phone, code, purpose, expiresAt },
  });

  await provider.send(phone, code, purpose);
}

export async function verifyOtp(phone: string, code: string, purpose: string): Promise<boolean> {
  const otp = await prisma.otpCode.findFirst({
    where: {
      phone,
      code,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) return false;

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  });

  return true;
}
