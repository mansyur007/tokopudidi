import { prisma } from '@tokopudidi/database';
import { NotFoundError } from '../../lib/errors';
import { toProductCard } from '../product/product.service';
import type { ProductCard } from '../product/product.service';

export async function addToWishlist(userId: string, productId: string): Promise<void> {
  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) throw new NotFoundError('Produk tidak ditemukan');

  await prisma.wishlist.upsert({
    where: { userId_productId: { userId, productId } },
    update: {},
    create: { userId, productId },
  });
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await prisma.wishlist.deleteMany({ where: { userId, productId } });
}

export async function getWishlistCount(userId: string): Promise<number> {
  return prisma.wishlist.count({ where: { userId } });
}

// Daftar productId saja — dipakai FE untuk cek status hati di ProductCard tanpa fetch penuh.
export async function listWishlistProductIds(userId: string): Promise<string[]> {
  const rows = await prisma.wishlist.findMany({ where: { userId }, select: { productId: true } });
  return rows.map((r) => r.productId);
}

export async function listWishlist(
  userId: string,
  page: number,
  limit: number,
): Promise<{ items: ProductCard[]; total: number; page: number; limit: number }> {
  const skip = (page - 1) * limit;

  const [total, rows] = await Promise.all([
    prisma.wishlist.count({ where: { userId } }),
    prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        product: {
          include: {
            images: { orderBy: { order: 'asc' }, take: 1 },
            shop: { select: { id: true, name: true, slug: true, city: true } },
          },
        },
      },
    }),
  ]);

  const items: ProductCard[] = rows
    .filter((w) => w.product && !w.product.deletedAt)
    .map((w) => toProductCard(w.product));

  return { items, total, page, limit };
}
