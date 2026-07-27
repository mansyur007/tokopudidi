import { Router } from 'express';
import { sellerRespondComplaintSchema, decideComplaintSchema } from '@tokopudidi/shared';
import { ok } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { requireShopOwner } from '../seller/seller.middleware';
import {
  sellerRespond,
  escalateComplaint,
  decideComplaint,
  listComplaintsForBuyer,
  listComplaintsForShop,
  listComplaintsForAdmin,
} from './complaint.service';

function readFilter(query: Record<string, unknown>) {
  return {
    status: String(query.status ?? 'ALL'),
    page: Math.max(1, Number(query.page ?? 1)),
    limit: Math.min(50, Number(query.limit ?? 20)),
  };
}

// ===== Buyer & seller aksi — /api/v1/complaints =====
export const complaintRouter = Router();
complaintRouter.use(requireAuth);

// GET /api/v1/complaints — komplain milik buyer yang login.
complaintRouter.get('/', async (req, res, next) => {
  try {
    return ok(res, await listComplaintsForBuyer(req.user!.sub, readFilter(req.query)));
  } catch (err) { next(err); }
});

// POST /api/v1/complaints/:id/seller-respond — kepemilikan toko dicek di service.
complaintRouter.post('/:id/seller-respond', validateBody(sellerRespondComplaintSchema), async (req, res, next) => {
  try {
    const complaint = await sellerRespond(req.user!.sub, req.params.id, req.body);
    return ok(res, complaint, req.body.accept ? 'Komplain diterima' : 'Tanggapan terkirim');
  } catch (err) { next(err); }
});

// POST /api/v1/complaints/:id/escalate — buyer naik banding ke admin.
complaintRouter.post('/:id/escalate', async (req, res, next) => {
  try {
    const complaint = await escalateComplaint(req.user!.sub, req.params.id);
    return ok(res, complaint, 'Komplain dinaikkan ke admin');
  } catch (err) { next(err); }
});

// ===== Seller queue — /api/v1/seller/complaints =====
export const sellerComplaintRouter = Router();
sellerComplaintRouter.use(requireAuth, requireShopOwner);

sellerComplaintRouter.get('/', async (req, res, next) => {
  try {
    return ok(res, await listComplaintsForShop(req.shop!.id, readFilter(req.query)));
  } catch (err) { next(err); }
});

// ===== Admin queue — /api/v1/admin/complaints =====
export const adminComplaintRouter = Router();
adminComplaintRouter.use(requireAuth, requireRole('ADMIN'));

adminComplaintRouter.get('/', async (req, res, next) => {
  try {
    return ok(res, await listComplaintsForAdmin(readFilter(req.query)));
  } catch (err) { next(err); }
});

// POST /api/v1/admin/complaints/:id/decide — keputusan final.
adminComplaintRouter.post('/:id/decide', validateBody(decideComplaintSchema), async (req, res, next) => {
  try {
    const complaint = await decideComplaint(req.params.id, req.body);
    return ok(res, complaint, 'Keputusan tersimpan');
  } catch (err) { next(err); }
});
