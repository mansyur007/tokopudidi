import { prisma, Prisma } from '@tokopudidi/database';
import type { ProductListQuery } from '@tokopudidi/shared';

// Output ringkas untuk listing card. Hindari send semua relasi supaya payload kecil.
export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  shop: { id: string; name: string; slug: string; city: string };
}

function buildOrderBy(sort: ProductListQuery['sort']): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'bestseller': return [{ soldCount: 'desc' }, { createdAt: 'desc' }];
    case 'cheapest':   return [{ price: 'asc' }];
    case 'expensive':  return [{ price: 'desc' }];
    case 'newest':     return [{ createdAt: 'desc' }];
    case 'rating':     return [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }];
    case 'relevance':
    default:
      // tanpa search query, "relevance" jatuh ke campuran sold + recent.
      return [{ soldCount: 'desc' }, { createdAt: 'desc' }];
  }
}

export async function listProducts(query: ProductListQuery): Promise<{
  items: ProductCard[];
  total: number;
  page: number;
  limit: number;
}> {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    deletedAt: null,
    stock: { gt: 0 },
  };

  if (query.q) {
    where.OR = [
      { name:        { contains: query.q, mode: 'insensitive' } },
      { description: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.categorySlug) {
    where.category = { slug: query.categorySlug };
  }
  if (query.shopId) where.shopId = query.shopId;
  if (query.condition) where.condition = query.condition;
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {};
    if (query.minPrice !== undefined) where.price.gte = query.minPrice;
    if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
  }
  if (query.minRating !== undefined) where.ratingAvg = { gte: query.minRating };
  if (query.province) where.shop = { ...(where.shop as object), province: query.province };

  const skip = (query.page - 1) * query.limit;

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: buildOrderBy(query.sort),
      skip,
      take: query.limit,
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        shop:   { select: { id: true, name: true, slug: true, city: true } },
      },
    }),
  ]);

  const items: ProductCard[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    imageUrl: p.images[0]?.url ?? null,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    soldCount: p.soldCount,
    shop: p.shop,
  }));

  return { items, total, page: query.page, limit: query.limit };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      images: { orderBy: { order: 'asc' } },
      variants: { where: { isActive: true } },
      category: { select: { id: true, name: true, slug: true } },
      shop: {
        select: {
          id: true, name: true, slug: true, logoUrl: true, city: true,
          ratingAvg: true, ratingCount: true, totalSold: true, isOpen: true,
          ktpVerified: true,
        },
      },
    },
  });
  return product;
}

export async function getRelatedProducts(productId: string, limit = 6): Promise<ProductCard[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true, shopId: true },
  });
  if (!product) return [];

  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      stock: { gt: 0 },
      id: { not: productId },
      OR: [
        { categoryId: product.categoryId },
        { shopId: product.shopId },
      ],
    },
    orderBy: [{ soldCount: 'desc' }, { ratingAvg: 'desc' }],
    take: limit,
    include: {
      images: { orderBy: { order: 'asc' }, take: 1 },
      shop: { select: { id: true, name: true, slug: true, city: true } },
    },
  });

  return rows.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, price: p.price,
    imageUrl: p.images[0]?.url ?? null,
    ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, soldCount: p.soldCount,
    shop: p.shop,
  }));
}

export async function getForYouProducts(userId: string | undefined, limit = 30): Promise<ProductCard[]> {
  const fallback = () => listProducts({ sort: 'bestseller', page: 1, limit }).then((r) => r.items);

  if (!userId) return fallback();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [recentViews, orderItems, recentHourViews] = await Promise.all([
    prisma.productView.findMany({
      where: { userId, viewedAt: { gte: thirtyDaysAgo } },
      select: { productId: true },
    }),
    prisma.orderItem.findMany({
      where: { order: { buyerId: userId } },
      select: { productId: true },
    }),
    prisma.productView.findMany({
      where: { userId, viewedAt: { gte: oneHourAgo } },
      select: { productId: true },
    }),
  ]);

  const purchasedIds = orderItems.map((o) => o.productId);
  const historyIds = Array.from(new Set([...recentViews.map((v) => v.productId), ...purchasedIds]));
  const excludeIds = Array.from(new Set([...purchasedIds, ...recentHourViews.map((v) => v.productId)]));

  if (historyIds.length === 0) return fallback();

  const historyProducts = await prisma.product.findMany({
    where: { id: { in: historyIds } },
    select: { categoryId: true },
  });
  const categoryCounts = new Map<string, number>();
  for (const p of historyProducts) {
    categoryCounts.set(p.categoryId, (categoryCounts.get(p.categoryId) ?? 0) + 1);
  }
  const topCategoryIds = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([categoryId]) => categoryId);

  if (topCategoryIds.length === 0) return fallback();

  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      stock: { gt: 0 },
      categoryId: { in: topCategoryIds },
      id: { notIn: excludeIds },
    },
    orderBy: [{ soldCount: 'desc' }, { ratingAvg: 'desc' }],
    take: limit,
    include: {
      images: { orderBy: { order: 'asc' }, take: 1 },
      shop: { select: { id: true, name: true, slug: true, city: true } },
    },
  });

  const items: ProductCard[] = rows.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, price: p.price,
    imageUrl: p.images[0]?.url ?? null,
    ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, soldCount: p.soldCount,
    shop: p.shop,
  }));

  // Kalau hasil personalized kurang dari limit, lengkapi dengan bestseller global (tanpa duplikat).
  if (items.length < limit) {
    const have = new Set(items.map((i) => i.id));
    const padding = (await fallback()).filter((p) => !have.has(p.id));
    items.push(...padding.slice(0, limit - items.length));
  }

  return items;
}

export async function incrementViewCount(productId: string): Promise<void> {
  await prisma.product
    .update({
      where: { id: productId },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => undefined); // jangan ganggu user kalau gagal
}
