import { prisma, Prisma } from '@tokopudidi/database';
import { getEffectivePrice, getDiscountPct, getShopBadge } from '@tokopudidi/shared';
import type { ProductListQuery, ShopBadge } from '@tokopudidi/shared';
import { resolveFlashPrices } from '../flashSale/flashSale.service';
import { withVariantValues } from './variant.read';

/**
 * Field toko yang perlu diambil untuk sebuah kartu produk (M14-B1).
 *
 * Dipakai bersama oleh SEMUA query yang bermuara ke `toProductCard` — listing,
 * related, for-you, wishlist, baru-dilihat, dan produk di halaman toko. Satu
 * konstanta, bukan enam salinan literal: kalau kriteria badge nanti butuh field
 * baru, satu tempat yang berubah dan `CardRow` memaksa sisanya ikut (kalau ada
 * yang tertinggal, tsc yang menagih — bukan kartu yang diam-diam kehilangan
 * badge di satu halaman saja).
 */
export const CARD_SHOP_SELECT = {
  id: true, name: true, slug: true, city: true,
  isOfficialStore: true, ktpVerified: true, ratingAvg: true, totalSold: true,
} as const;

// Output ringkas untuk listing card. Hindari send semua relasi supaya payload kecil.
export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  price: number;                 // harga efektif saat ini (sudah termasuk sale M9-B3)
  originalPrice: number | null;  // harga coret — terisi hanya saat sale aktif
  discountPct: number | null;    // persen diskon — terisi hanya saat sale aktif
  saleEndAt: Date | null;        // untuk countdown di FE
  imageUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  // Badge dikirim sebagai HASIL, bukan bahan mentahnya: `ratingAvg`/`totalSold`
  // milik toko tidak dipakai untuk apa pun lagi di kartu, jadi mengirimnya cuma
  // memperbesar payload dan menggoda FE menghitung ulang aturan yang sama.
  shop: { id: string; name: string; slug: string; city: string; badge: ShopBadge | null };
}

export type CardRow = {
  id: string; slug: string; name: string;
  price: number; salePrice: number | null; saleStartAt: Date | null; saleEndAt: Date | null;
  ratingAvg: number; ratingCount: number; soldCount: number;
  images: { url: string }[];
  shop: {
    id: string; name: string; slug: string; city: string;
    isOfficialStore: boolean; ktpVerified: boolean; ratingAvg: number; totalSold: number;
  };
};

export function toProductCard(p: CardRow): ProductCard {
  const effective = getEffectivePrice(p);
  const discountPct = getDiscountPct(p);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: effective,
    originalPrice: discountPct != null ? p.price : null,
    discountPct,
    saleEndAt: discountPct != null ? p.saleEndAt : null,
    imageUrl: p.images[0]?.url ?? null,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    soldCount: p.soldCount,
    shop: {
      id: p.shop.id,
      name: p.shop.name,
      slug: p.shop.slug,
      city: p.shop.city,
      badge: getShopBadge(p.shop),
    },
  };
}

/**
 * Pasang harga flash sale (M15-C1) ke sebuah kartu produk.
 *
 * Harga coret yang ditampilkan adalah harga normal produk, bukan harga sale
 * M9-B3 yang mungkin sedang jalan: "hemat sekian" harus diukur dari angka yang
 * tertera di luar event. Kalau harga flash-nya ternyata tidak lebih murah,
 * kartunya dikembalikan apa adanya — sama seperti `resolveUnitPrice`, promo
 * tidak boleh menaikkan harga.
 */
export function withFlashPrice(card: ProductCard, salePrice: number): ProductCard {
  const asli = card.originalPrice ?? card.price;
  if (salePrice >= card.price) return card;
  return {
    ...card,
    price: salePrice,
    originalPrice: asli,
    discountPct: Math.round(((asli - salePrice) / asli) * 100),
  };
}

/**
 * Tempelkan harga flash ke daftar kartu produk mana pun.
 *
 * Dibuat sebagai pasca-proses atas `ProductCard[]`, bukan parameter tambahan di
 * `toProductCard`: enam query berbeda bermuara ke sana (lihat CARD_SHOP_SELECT),
 * dan menyisipkan lookup ke masing-masing `include` adalah cara paling pasti
 * untuk suatu hari melewatkan satu — persis kekeliruan yang dibayar M14-B1,
 * ketika toko yang sama tampil ber-badge di beranda tapi polos di wishlist.
 * Harga yang berbeda antar halaman jauh lebih buruk lagi.
 *
 * Biayanya satu query indexed per daftar, dan `resolveFlashPrices` berhenti
 * lebih awal kalau daftarnya kosong.
 */
export async function applyFlashPrices(
  cards: ProductCard[],
  now: Date = new Date(),
): Promise<ProductCard[]> {
  if (cards.length === 0) return cards;
  const hits = await resolveFlashPrices(cards.map((c) => c.id), now);
  if (hits.size === 0) return cards;
  return cards.map((c) => {
    const hit = hits.get(c.id);
    return hit ? withFlashPrice(c, hit.salePrice) : c;
  });
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
  if (query.freeShipping) where.freeShippingEligible = true;
  if (query.cod) where.codAvailable = true;

  // Filter yang menempel ke toko digabung dalam satu objek `shop`.
  const shopWhere: Prisma.ShopWhereInput = {};
  if (query.province) shopWhere.province = query.province;
  // Multi-kota: semantik OR antar kota yang dipilih.
  if (query.cities?.length) shopWhere.city = { in: query.cities };
  if (query.officialStoreOnly) shopWhere.isOfficialStore = true;
  if (Object.keys(shopWhere).length > 0) where.shop = shopWhere;

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
        shop:   { select: CARD_SHOP_SELECT },
      },
    }),
  ]);

  const items = await applyFlashPrices(rows.map(toProductCard));

  return { items, total, page: query.page, limit: query.limit };
}

/**
 * Daftar kota yang punya produk aktif, beserta jumlah produknya — untuk mengisi
 * grup filter "Lokasi" di halaman pencarian (M10-A10). Raw query karena Prisma
 * groupBy tidak bisa mengelompokkan lewat field relasi.
 */
export async function listProductCities(): Promise<{ city: string; count: number }[]> {
  return prisma.$queryRaw<{ city: string; count: number }[]>`
    SELECT s."city" AS city, COUNT(*)::int AS count
    FROM "Product" p
    JOIN "Shop" s ON s."id" = p."shopId"
    WHERE p."isActive" = true AND p."deletedAt" IS NULL AND p."stock" > 0
    GROUP BY s."city"
    ORDER BY count DESC, city ASC
  `;
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      images: { orderBy: { order: 'asc' } },
      // Variant multi-axis (M11-A8) — hanya kombinasi aktif yang ditawarkan.
      variants: {
        where: { isActive: true },
        include: {
          values: { select: { optionValue: { select: { id: true, value: true, option: { select: { order: true } } } } } },
        },
      },
      options: { orderBy: { order: 'asc' }, include: { values: { orderBy: { order: 'asc' } } } },
      // Harga grosir (M13-B1) — dikirim mentah; FE menghitung harga per qty
      // lewat `getUnitPrice` yang sama dengan yang dipakai server.
      wholesaleTiers: { orderBy: { minQty: 'asc' }, select: { minQty: true, price: true } },
      category: { select: { id: true, name: true, slug: true } },
      shop: {
        select: {
          id: true, name: true, slug: true, logoUrl: true, city: true,
          ratingAvg: true, ratingCount: true, totalSold: true, isOpen: true,
          ktpVerified: true, isOfficialStore: true,
        },
      },
    },
  });
  if (!product) return product;

  // `ktpVerified` & `isOfficialStore` sengaja TIDAK ikut keluar ke pembeli:
  // keduanya bahan mentah badge, dan sebelum M14-B1 justru `ktpVerified` inilah
  // yang salah dipakai FE untuk melabeli "Official Store". Menghapusnya dari
  // payload memastikan kekeliruan itu tidak bisa terulang diam-diam.
  const { ktpVerified, isOfficialStore, ...shop } = product.shop;

  // Halaman detail mengirim field harga MENTAH dan FE menghitung sendiri lewat
  // `getUnitPrice` (harga per qty bergantung tier grosir). Karena itu harga
  // flash harus ikut dikirim sebagai bahan, bukan sebagai hasil — kalau tidak,
  // BuyBox akan menampilkan harga normal untuk produk yang di beranda barusan
  // diiklankan murah.
  const flash = (await resolveFlashPrices([product.id])).get(product.id) ?? null;

  return withVariantValues({
    ...product,
    flashPrice: flash?.salePrice ?? null,
    flashEndAt: flash?.endAt ?? null,
    flashRemaining: flash?.remaining ?? null,
    shop: { ...shop, badge: getShopBadge({ ktpVerified, isOfficialStore, ...shop }) },
  });
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
      shop: { select: CARD_SHOP_SELECT },
    },
  });

  return applyFlashPrices(rows.map(toProductCard));
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
      shop: { select: CARD_SHOP_SELECT },
    },
  });

  const items: ProductCard[] = await applyFlashPrices(rows.map(toProductCard));

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
