// M14-A2 — jembatan antara peristiwa domain dan lapisan email.
//
// Kenapa lapisan ini ada, alih-alih memanggil `sendMail` langsung di service:
// setiap email butuh data yang tidak selalu ada di tangan pemanggil (alamat
// email pemilik toko, nama pembeli, item pesanan). Kalau query itu ditulis di
// jalur request, checkout ikut menunggu pekerjaan yang hasilnya tidak
// memengaruhi respons sama sekali.
//
// Pola pemakaian di call site selalu satu baris:
//
//     void notifyOrderPaid(order.id);
//
// `void` bukan hiasan: tanpa itu, promise yang ditolak menjadi unhandled
// rejection yang di Node 20 mematikan proses. Setiap fungsi di sini menangkap
// errornya sendiri dan berhenti jadi baris log — email yang gagal tidak boleh
// menggagalkan transaksi yang sudah sukses.
import { prisma } from '@tokopudidi/database';
import { logger } from './logger';
import { sendMail } from './email';
import {
  complaintDecidedEmail,
  orderCreatedEmail,
  orderPaidEmail,
  orderShippedEmail,
  refundDecidedEmail,
  welcomeEmail,
} from './email.templates';

const log = logger.child({ mod: 'emailEvents' });

/** Bungkus seragam: apa pun yang gagal di dalam berhenti di sini. */
async function jalankan(nama: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    log.error({ err, event: nama }, 'gagal menyiapkan email');
  }
}

/** 1. Pesanan dibuat → pembeli. Satu email per toko, sesuai pemecahan order. */
export function notifyOrderCreated(buyerId: string, orderIds: string[]): Promise<void> {
  return jalankan('order_created', async () => {
    const buyer = await prisma.user.findUnique({
      where: { id: buyerId },
      select: { email: true },
    });
    if (!buyer?.email) return; // user tanpa email — tidak ada yang perlu dikirim.

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: {
        orderNumber: true,
        total: true,
        paymentMethod: true,
        createdAt: true,
        shopAddress: true,
        items: { select: { productName: true, quantity: true, price: true } },
      },
    });

    for (const o of orders) {
      // `shopAddress` adalah snapshot JSON saat checkout — dipakai supaya nama
      // toko di email sama dengan yang tercetak di invoice, bukan nama toko
      // hari ini yang bisa sudah berubah.
      const shopName = (o.shopAddress as { name?: string } | null)?.name ?? 'toko';
      const { subject, html } = orderCreatedEmail({
        orderNumber: o.orderNumber,
        total: o.total,
        paymentMethod: o.paymentMethod,
        shopName,
        createdAt: o.createdAt,
        items: o.items.map((it) => ({ name: it.productName, qty: it.quantity, price: it.price })),
      });
      sendMail({ to: buyer.email, subject, html });
    }
  });
}

/** 2. Pesanan dibayar → pemilik toko. */
export function notifyOrderPaid(orderId: string): Promise<void> {
  return jalankan('order_paid', async () => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        buyer: { select: { fullName: true } },
        shop: { select: { owner: { select: { email: true } } } },
      },
    });
    const to = order?.shop.owner.email;
    if (!order || !to) return;

    const { subject, html } = orderPaidEmail({
      orderNumber: order.orderNumber,
      total: order.total,
      buyerName: order.buyer.fullName,
      orderId: order.id,
    });
    sendMail({ to, subject, html });
  });
}

/** 3. Pesanan dikirim + resi → pembeli. */
export function notifyOrderShipped(orderId: string): Promise<void> {
  return jalankan('order_shipped', async () => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        courierName: true,
        trackingNumber: true,
        buyer: { select: { email: true } },
      },
    });
    if (!order?.buyer.email) return;

    const { subject, html } = orderShippedEmail({
      orderNumber: order.orderNumber,
      courierName: order.courierName ?? '-',
      trackingNumber: order.trackingNumber ?? '-',
      orderId: order.id,
    });
    sendMail({ to: order.buyer.email, subject, html });
  });
}

/** 4a. Komplain diputus admin → pembeli. */
export function notifyComplaintDecided(complaintId: string, menang: boolean): Promise<void> {
  return jalankan('complaint_decided', async () => {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: {
        adminDecision: true,
        buyer: { select: { email: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });
    if (!complaint?.buyer.email) return;

    const { subject, html } = complaintDecidedEmail({
      orderNumber: complaint.order.orderNumber,
      menang,
      catatan: complaint.adminDecision,
      orderId: complaint.order.id,
    });
    sendMail({ to: complaint.buyer.email, subject, html });
  });
}

/** 4b. Pengajuan refund diputus admin → pengaju. */
export function notifyRefundDecided(refundId: string, disetujui: boolean): Promise<void> {
  return jalankan('refund_decided', async () => {
    const refund = await prisma.refundRequest.findUnique({
      where: { id: refundId },
      select: {
        adminNote: true,
        requestedBy: { select: { email: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });
    if (!refund?.requestedBy.email) return;

    const { subject, html } = refundDecidedEmail({
      orderNumber: refund.order.orderNumber,
      disetujui,
      catatan: refund.adminNote,
      orderId: refund.order.id,
    });
    sendMail({ to: refund.requestedBy.email, subject, html });
  });
}

/** 5. Welcome saat register dengan email terisi. */
export function notifyWelcome(email: string | null | undefined, fullName: string): Promise<void> {
  return jalankan('welcome', async () => {
    if (!email) return;
    const { subject, html } = welcomeEmail({ fullName });
    sendMail({ to: email, subject, html });
  });
}
