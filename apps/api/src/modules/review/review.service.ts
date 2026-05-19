import { prisma } from '@tokopudidi/database';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../../lib/errors';

// Recompute rating produk + toko setelah review baru/edit/hidden.
async function recomputeRatings(productId: string, shopId: string) {
  const productAgg = await prisma.review.aggregate({
    where: { productId, isHidden: false },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAvg: productAgg._avg.rating ?? 0,
      ratingCount: productAgg._count.rating,
    },
  });

  const shopAgg = await prisma.review.aggregate({
    where: { shopId, isHidden: false },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.shop.update({
    where: { id: shopId },
    data: {
      ratingAvg: shopAgg._avg.rating ?? 0,
      ratingCount: shopAgg._count.rating,
    },
  });
}

export async function createReview(
  buyerId: string,
  data: { orderItemId: string; rating: number; comment?: string; imageUrls?: string[] },
) {
  const item = await prisma.orderItem.findUnique({
    where: { id: data.orderItemId },
    include: { order: { select: { id: true, buyerId: true, status: true, shopId: true } } },
  });
  if (!item) throw new NotFoundError('Item pesanan tidak ditemukan');
  if (item.order.buyerId !== buyerId) throw new ForbiddenError('Bukan pesanan kamu');
  if (item.order.status !== 'COMPLETED') {
    throw new BadRequestError('Selesaikan pesanan dulu sebelum kasih ulasan');
  }

  const existing = await prisma.review.findUnique({
    where: { orderItemId: data.orderItemId },
  });
  if (existing) throw new ConflictError('Item ini sudah pernah diulas');

  const review = await prisma.review.create({
    data: {
      orderItemId: data.orderItemId,
      buyerId,
      productId: item.productId,
      shopId: item.order.shopId,
      rating: data.rating,
      comment: data.comment || null,
      imageUrls: data.imageUrls ?? [],
    },
  });
  await recomputeRatings(item.productId, item.order.shopId);

  // Notifikasi seller.
  const shop = await prisma.shop.findUnique({ where: { id: item.order.shopId }, select: { ownerId: true, name: true } });
  if (shop) {
    await prisma.notification.create({
      data: {
        userId: shop.ownerId,
        type: 'ORDER_UPDATE',
        title: 'Ulasan baru masuk',
        body: `Ada ulasan ${data.rating}⭐ untuk produk kamu.`,
        linkUrl: `/seller/ulasan`,
      },
    });
  }

  return review;
}

export async function listProductReviews(productId: string, opts: { ratingFilter?: number; withImageOnly?: boolean; page: number; limit: number }) {
  const where = {
    productId,
    isHidden: false,
    ...(opts.ratingFilter ? { rating: opts.ratingFilter } : {}),
    ...(opts.withImageOnly ? { imageUrls: { isEmpty: false } } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (opts.page - 1) * opts.limit,
      take: opts.limit,
      include: {
        buyer: { select: { fullName: true, avatarUrl: true } },
      },
    }),
  ]);
  return { items, total, page: opts.page, limit: opts.limit };
}

export async function listShopReviews(shopId: string, page = 1, limit = 20, ratingFilter?: number) {
  const where = {
    shopId,
    isHidden: false,
    ...(ratingFilter ? { rating: ratingFilter } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        buyer:   { select: { fullName: true } },
        product: { select: { name: true, slug: true } },
      },
    }),
  ]);
  return { items, total, page, limit };
}

export async function sellerReply(ownerId: string, reviewId: string, reply: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { shop: { select: { ownerId: true } } },
  });
  if (!review) throw new NotFoundError('Ulasan tidak ditemukan');
  if (review.shop.ownerId !== ownerId) throw new ForbiddenError('Bukan toko kamu');
  if (review.sellerReply) throw new ConflictError('Balasan sudah pernah dibuat (hanya 1×)');

  return prisma.review.update({
    where: { id: reviewId },
    data: { sellerReply: reply, sellerRepliedAt: new Date() },
  });
}

export async function getReviewableItems(buyerId: string) {
  // Order items dari order COMPLETED yang belum di-review.
  const items = await prisma.orderItem.findMany({
    where: {
      order: { buyerId, status: 'COMPLETED' },
      review: { is: null },
    },
    orderBy: { id: 'desc' },
    take: 50,
    include: {
      order: { select: { id: true, orderNumber: true, completedAt: true, shop: { select: { name: true, slug: true } } } },
    },
  });
  return items;
}
