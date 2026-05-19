import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { ok } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { requireShopOwner } from './seller.middleware';

export const sellerDashboardRouter = Router();
sellerDashboardRouter.use(requireAuth, requireShopOwner);

// GET /api/v1/seller/dashboard — metrics + grafik 7 hari + 5 pesanan terbaru perlu aksi.
sellerDashboardRouter.get('/dashboard', async (req, res, next) => {
  try {
    const shopId = req.shop!.id;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const [todayOrders, weekRevenue, activeProducts, shop, recentOrders, weekOrders] = await Promise.all([
      prisma.order.count({
        where: { shopId, createdAt: { gte: startOfToday }, status: { not: 'CANCELLED' } },
      }),
      prisma.order.aggregate({
        where: {
          shopId,
          createdAt: { gte: startOfWeek },
          status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
        },
        _sum: { total: true },
      }),
      prisma.product.count({ where: { shopId, isActive: true, deletedAt: null } }),
      prisma.shop.findUnique({
        where: { id: shopId },
        select: { ratingAvg: true, ratingCount: true, totalSold: true, balance: true, pendingBalance: true, ktpVerified: true, isOpen: true },
      }),
      prisma.order.findMany({
        where: { shopId, status: { in: ['PAID', 'PROCESSING'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, orderNumber: true, status: true, total: true, createdAt: true,
          buyer: { select: { fullName: true } },
        },
      }),
      // Total order per hari untuk 7 hari terakhir.
      prisma.order.findMany({
        where: {
          shopId,
          createdAt: { gte: startOfWeek },
          status: { not: 'CANCELLED' },
        },
        select: { createdAt: true, total: true },
      }),
    ]);

    // Group order ke 7 bucket harian.
    const buckets: { date: string; orderCount: number; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      buckets.push({ date: key, orderCount: 0, revenue: 0 });
    }
    for (const o of weekOrders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const b = buckets.find((x) => x.date === key);
      if (b) {
        b.orderCount += 1;
        b.revenue += o.total;
      }
    }

    return ok(res, {
      todayOrders,
      weekRevenue: weekRevenue._sum.total ?? 0,
      activeProducts,
      shop,
      recentOrders,
      chart: buckets,
    });
  } catch (err) { next(err); }
});
