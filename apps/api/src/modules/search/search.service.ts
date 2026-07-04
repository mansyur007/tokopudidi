import { prisma } from '@tokopudidi/database';

export interface SuggestResult {
  products: { id: string; name: string; slug: string; imageUrl: string | null }[];
  categories: { id: string; name: string; slug: string }[];
  shops: { id: string; name: string; slug: string; logoUrl: string | null }[];
}

export async function getSuggestions(q: string): Promise<SuggestResult> {
  if (q.trim().length < 2) return { products: [], categories: [], shops: [] };

  const [products, categories, shops] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, deletedAt: null, name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true, images: { orderBy: { order: 'asc' }, take: 1 } },
      orderBy: [{ soldCount: 'desc' }],
      take: 5,
    }),
    prisma.category.findMany({
      where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true },
      take: 3,
    }),
    prisma.shop.findMany({
      where: { deletedAt: null, name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true, logoUrl: true },
      take: 3,
    }),
  ]);

  return {
    products: products.map((p) => ({ id: p.id, name: p.name, slug: p.slug, imageUrl: p.images[0]?.url ?? null })),
    categories,
    shops,
  };
}

export async function addSearchHistory(userId: string, query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  // Hindari duplikat berturut-turut — hapus entry lama dengan query sama, catat ulang di atas.
  await prisma.searchHistory.deleteMany({ where: { userId, query: trimmed } });
  await prisma.searchHistory.create({ data: { userId, query: trimmed } });
}

export async function getSearchHistory(userId: string, limit = 5) {
  return prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { searchedAt: 'desc' },
    take: limit,
    select: { id: true, query: true, searchedAt: true },
  });
}

export async function removeSearchHistory(userId: string, id: string): Promise<void> {
  await prisma.searchHistory.deleteMany({ where: { id, userId } });
}
