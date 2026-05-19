import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { ok } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';

export const notificationRouter = Router();
notificationRouter.use(requireAuth);

// GET /api/v1/notifications
notificationRouter.get('/', async (req, res, next) => {
  try {
    const items = await prisma.notification.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return ok(res, items);
  } catch (err) { next(err); }
});

// GET /api/v1/notifications/unread-count
notificationRouter.get('/unread-count', async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.sub, readAt: null },
    });
    return ok(res, { count });
  } catch (err) { next(err); }
});

// POST /api/v1/notifications/:id/read
notificationRouter.post('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.sub },
      data: { readAt: new Date() },
    });
    return ok(res, null);
  } catch (err) { next(err); }
});

// POST /api/v1/notifications/read-all
notificationRouter.post('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.sub, readAt: null },
      data: { readAt: new Date() },
    });
    return ok(res, null, 'Semua notifikasi ditandai dibaca');
  } catch (err) { next(err); }
});
