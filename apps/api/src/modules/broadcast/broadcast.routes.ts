import { Router } from 'express';
import { broadcastCreateSchema } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { requireShopOwner } from '../seller/seller.middleware';
import { createBroadcast, getBroadcastStatus, listBroadcasts } from './broadcast.service';

export const sellerBroadcastRouter = Router();
sellerBroadcastRouter.use(requireAuth, requireShopOwner);

// GET /api/v1/seller/broadcast — riwayat + status (jumlah follower & sisa jeda).
// Digabung dalam satu respons supaya halaman seller tidak perlu dua request
// untuk memutuskan tombol kirim aktif atau tidak.
sellerBroadcastRouter.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? '1') || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? '20') || 20));
    const [history, status] = await Promise.all([
      listBroadcasts(req.shop!.id, page, limit),
      getBroadcastStatus(req.shop!.id),
    ]);
    return ok(res, { ...history, status });
  } catch (err) { next(err); }
});

// POST /api/v1/seller/broadcast
sellerBroadcastRouter.post('/', validateBody(broadcastCreateSchema), async (req, res, next) => {
  try {
    const result = await createBroadcast(req.shop!, req.body);

    // Fan-out baru jalan setelah respons benar-benar terkirim. Kalau ditunggu
    // di dalam handler, seller dengan ribuan follower menatap spinner selama
    // penulisan notifikasi yang sama sekali tidak memengaruhi jawabannya.
    res.on('finish', () => { void result.fanOut(); });

    return created(
      res,
      result.broadcast,
      `Pengumuman dikirim ke ${result.broadcast.recipientCount} follower`,
    );
  } catch (err) { next(err); }
});
