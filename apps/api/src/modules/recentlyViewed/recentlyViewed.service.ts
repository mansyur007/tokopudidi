import { prisma } from '@tokopudidi/database';
import type { ProductCard } from '../product/product.service';

export interface Viewer {
  userId?: string;
  sessionKey?: string;
}

export async function recordProductView(viewer: Viewer, productId: string): Promise<void> {
  if (viewer.userId) {
    await prisma.productView.upsert({
      where: { userId_productId: { userId: viewer.userId, productId } },
      update: { viewedAt: new Date() },
      create: { userId: viewer.userId, productId },
    }).catch(() => undefined);
    return;
  }
  if (viewer.sessionKey) {
    await prisma.productView.upsert({
      where: { sessionKey_productId: { sessionKey: viewer.sessionKey, productId } },
      update: { viewedAt: new Date() },
      create: { sessionKey: viewer.sessionKey, productId },
    }).catch(() => undefined);
  }
}

export async function getRecentProducts(viewer: Viewer, limit = 10): Promise<ProductCard[]> {
  const where = viewer.userId ? { userId: viewer.userId } : { sessionKey: viewer.sessionKey };
  if (!where.userId && !where.sessionKey) return [];

  const rows = await prisma.productView.findMany({
    where,
    orderBy: { viewedAt: 'desc' },
    take: limit,
    include: {
      product: {
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          shop: { select: { id: true, name: true, slug: true, city: true } },
        },
      },
    },
  });

  return rows
    .filter((v) => v.product && !v.product.deletedAt)
    .map((v) => ({
      id: v.product.id,
      slug: v.product.slug,
      name: v.product.name,
      price: v.product.price,
      imageUrl: v.product.images[0]?.url ?? null,
      ratingAvg: v.product.ratingAvg,
      ratingCount: v.product.ratingCount,
      soldCount: v.product.soldCount,
      shop: v.product.shop,
    }));
}

export async function removeRecentProduct(viewer: Viewer, productId: string): Promise<void> {
  if (viewer.userId) {
    await prisma.productView.deleteMany({ where: { userId: viewer.userId, productId } });
    return;
  }
  if (viewer.sessionKey) {
    await prisma.productView.deleteMany({ where: { sessionKey: viewer.sessionKey, productId } });
  }
}
