import { Router } from 'express';
import {
  checkoutSchema,
  cancelOrderSchema,
  uploadProofSchema,
  requestRefundSchema,
} from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import {
  checkout,
  listOrdersForBuyer,
  getOrderForBuyer,
  cancelOrder,
  completeOrder,
  uploadPaymentProof,
  requestRefund,
} from './order.service';
import { generatePaymentInstruction, markOrderAsPaid } from '../payment/payment.service';
import { mockTracking } from '../shipping/shipping.service';

export const orderRouter = Router();
orderRouter.use(requireAuth);

// POST /api/v1/orders/checkout — buat order dari cart.
orderRouter.post('/checkout', validateBody(checkoutSchema), async (req, res, next) => {
  try {
    const orders = await checkout(req.user!.sub, req.body);
    return created(res, { orders }, 'Pesanan berhasil dibuat. Lanjut ke pembayaran ya!');
  } catch (err) { next(err); }
});

// GET /api/v1/orders?status=...&page=...
orderRouter.get('/', async (req, res, next) => {
  try {
    const status = String(req.query.status ?? 'ALL');
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Number(req.query.limit ?? 20));
    const result = await listOrdersForBuyer(req.user!.sub, { status, page, limit });
    return ok(res, result);
  } catch (err) { next(err); }
});

// GET /api/v1/orders/:id
orderRouter.get('/:id', async (req, res, next) => {
  try {
    const order = await getOrderForBuyer(req.user!.sub, req.params.id);
    // Tambahkan tracking dummy kalau sudah dikirim.
    let tracking = null;
    if (order.shippedAt && order.trackingNumber) {
      tracking = mockTracking(order.trackingNumber, order.shippedAt);
    }
    return ok(res, { ...order, tracking });
  } catch (err) { next(err); }
});

// POST /api/v1/orders/:id/pay — untuk QRIS_MOCK auto-paid.
orderRouter.post('/:id/pay', async (req, res, next) => {
  try {
    const order = await getOrderForBuyer(req.user!.sub, req.params.id);
    if (order.status !== 'PENDING_PAYMENT') {
      return ok(res, order, 'Pesanan sudah dibayar atau tidak butuh pembayaran');
    }
    if (order.paymentMethod !== 'QRIS_MOCK') {
      return ok(res, order, 'Endpoint ini hanya untuk QRIS mock');
    }
    await markOrderAsPaid(order.id);
    return ok(res, null, 'Pembayaran berhasil!');
  } catch (err) { next(err); }
});

// GET /api/v1/orders/:id/payment-instruction
orderRouter.get('/:id/payment-instruction', async (req, res, next) => {
  try {
    const order = await getOrderForBuyer(req.user!.sub, req.params.id);
    const instruction = await generatePaymentInstruction(order.id, order.total);
    return ok(res, instruction);
  } catch (err) { next(err); }
});

// POST /api/v1/orders/:id/upload-proof
orderRouter.post('/:id/upload-proof', validateBody(uploadProofSchema), async (req, res, next) => {
  try {
    const proof = await uploadPaymentProof(req.user!.sub, req.params.id, req.body);
    return ok(res, proof, 'Bukti transfer berhasil diupload. Tunggu konfirmasi seller ya.');
  } catch (err) { next(err); }
});

// POST /api/v1/orders/:id/cancel
orderRouter.post('/:id/cancel', validateBody(cancelOrderSchema), async (req, res, next) => {
  try {
    const order = await cancelOrder(req.user!.sub, req.params.id, req.body.reason);
    return ok(res, order, 'Pesanan dibatalkan');
  } catch (err) { next(err); }
});

// POST /api/v1/orders/:id/complete
orderRouter.post('/:id/complete', async (req, res, next) => {
  try {
    const order = await completeOrder(req.user!.sub, req.params.id);
    return ok(res, order, 'Pesanan diselesaikan, terima kasih ya!');
  } catch (err) { next(err); }
});

// POST /api/v1/orders/:id/refund — buyer ajukan refund.
orderRouter.post('/:id/refund', validateBody(requestRefundSchema), async (req, res, next) => {
  try {
    const refund = await requestRefund(req.user!.sub, req.params.id, req.body);
    return created(res, refund, 'Pengajuan refund terkirim. Admin akan meninjau dalam 1-2 hari kerja.');
  } catch (err) { next(err); }
});
