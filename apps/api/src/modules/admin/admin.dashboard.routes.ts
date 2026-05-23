import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { ok } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';

// Dashboard admin: metrik platform + grafik 7 hari + antrian yang perlu aksi.
export const adminDashboardRouter = Router();
adminDashboardRouter.use(requireAuth, requireRole('ADMIN'));

adminDashboardRouter.get('/dashboard', async (_req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalSellers,
      totalShops,
      shopsPendingKtp,
      activeProducts,
      todayOrders,
      todayGmv,
      pendingRefunds,
      pendingPayments,
      reportedReviews,
      weekOrders,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: 'SELLER' } }),
      prisma.shop.count({ where: { deletedAt: null } }),
      prisma.shop.count({ where: { ktpVerified: false, deletedAt: null } }),
      prisma.product.count({ where: { isActive: true, deletedAt: null } }),
      prisma.order.count({ where: { createdAt: { gte: startOfToday }, status: { not: 'CANCELLED' } } }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfToday },
          status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
        },
        _sum: { total: true },
      }),
      prisma.refundRequest.count({ where: { status: 'PENDING' } }),
      prisma.paymentProof.count({ where: { verifiedAt: null, rejectedAt: null } }),
      prisma.review.count({ where: { isReported: true, isHidden: false } }),
      prisma.order.findMany({
        where: { createdAt: { gte: startOfWeek }, status: { not: 'CANCELLED' } },
        select: { createdAt: true, total: true },
      }),
    ]);

    // Group ke 7 bucket harian.
    const buckets: { date: string; orderCount: number; gmv: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      buckets.push({ date: d.toISOString().slice(0, 10), orderCount: 0, gmv: 0 });
    }
    for (const o of weekOrders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const b = buckets.find((x) => x.date === key);
      if (b) { b.orderCount += 1; b.gmv += o.total; }
    }

    return ok(res, {
      totalUsers,
      totalSellers,
      totalShops,
      shopsPendingKtp,
      activeProducts,
      todayOrders,
      todayGmv: todayGmv._sum.total ?? 0,
      pendingRefunds,
      pendingPayments,
      reportedReviews,
      chart: buckets,
    });
  } catch (err) { next(err); }
});
