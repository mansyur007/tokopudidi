// Mock payment service.
// QRIS_MOCK: simulasi auto-paid setelah ~30 detik (atau via endpoint /pay manual).
// TRANSFER_MANUAL: buyer upload bukti, seller verifikasi.
// COD: bayar saat barang tiba — order langsung ke PROCESSING setelah seller terima.
// Adapter pattern — siap diganti dengan Midtrans/Xendit di production.

import { prisma } from '@tokopudidi/database';
import { logger } from '../../lib/logger';

export interface PaymentProvider {
  generatePaymentInstruction(orderId: string, total: number): Promise<{
    method: string;
    qrCodeUrl?: string;
    bankAccounts?: Array<{ bank: string; accountName: string; accountNo: string }>;
    expiresAt: string;
  }>;
}

class MockPaymentProvider implements PaymentProvider {
  async generatePaymentInstruction(orderId: string, total: number) {
    logger.info({ orderId, total }, '💳 [MOCK PAY] Generate instruction');
    return {
      method: 'QRIS',
      // QR placeholder — gambar dummy.
      qrCodeUrl: `https://placehold.co/300x300/2D6A4F/ffffff/png?text=QRIS+${total}`,
      bankAccounts: [
        { bank: 'BCA',     accountName: 'PT Tokopudidi Mandiri', accountNo: '1234567890' },
        { bank: 'BRI',     accountName: 'PT Tokopudidi Mandiri', accountNo: '0987654321' },
        { bank: 'Mandiri', accountName: 'PT Tokopudidi Mandiri', accountNo: '1122334455' },
        { bank: 'BNI',     accountName: 'PT Tokopudidi Mandiri', accountNo: '5544332211' },
      ],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 jam
    };
  }
}

const provider: PaymentProvider = new MockPaymentProvider();

export const generatePaymentInstruction = provider.generatePaymentInstruction.bind(provider);

// Untuk QRIS_MOCK: tandai paid otomatis. Dipanggil dari endpoint /pay.
export async function markOrderAsPaid(orderId: string): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'PAID', paidAt: new Date() },
  });
  // Notifikasi seller (sederhana — record di Notification table).
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shop: { select: { ownerId: true } } },
  });
  if (order) {
    await prisma.notification.create({
      data: {
        userId: order.shop.ownerId,
        type: 'ORDER_UPDATE',
        title: 'Pesanan baru sudah dibayar!',
        body: `Pesanan ${order.orderNumber} sudah dibayar buyer. Yuk diproses.`,
        linkUrl: `/seller/pesanan/${order.id}`,
      },
    });
  }
}
