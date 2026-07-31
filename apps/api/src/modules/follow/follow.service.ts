import { prisma } from '@tokopudidi/database';
import { NotFoundError, BadRequestError } from '../../lib/errors';

// Bentuk kartu toko — sama persis dengan `ShopCard` yang dipakai /shops/featured
// supaya grid di /akun/toko-favorit bisa memakai komponen yang sama.
export interface ShopCard {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  city: string;
  ratingAvg: number;
  ratingCount: number;
  totalSold: number;
}

export interface FollowingResult {
  items: ShopCard[];
  total: number;
  page: number;
  limit: number;
}

const SHOP_CARD_SELECT = {
  id: true, slug: true, name: true, logoUrl: true, city: true,
  ratingAvg: true, ratingCount: true, totalSold: true,
} as const;

/**
 * Cari toko hidup berdasarkan slug. Follow ke toko yang sudah dihapus tidak
 * boleh diam-diam berhasil — daftar favoritnya akan berisi toko hantu.
 */
async function shopBySlugOrThrow(slug: string): Promise<{ id: string; ownerId: string }> {
  const shop = await prisma.shop.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, ownerId: true },
  });
  if (!shop) throw new NotFoundError('Toko tidak ditemukan');
  return shop;
}

export async function followShop(userId: string, slug: string): Promise<void> {
  const shop = await shopBySlugOrThrow(slug);
  // Follow toko sendiri ditolak: angkanya jadi menipu, dan broadcast M13-B2
  // akan mengirim notifikasi balik ke penjualnya sendiri.
  if (shop.ownerId === userId) {
    throw new BadRequestError('Kamu tidak bisa follow tokomu sendiri');
  }

  // Upsert, bukan create — klik ganda tidak boleh jadi error 500 dari PK bentrok.
  await prisma.shopFollower.upsert({
    where: { shopId_userId: { shopId: shop.id, userId } },
    update: {},
    create: { shopId: shop.id, userId },
  });
}

export async function unfollowShop(userId: string, slug: string): Promise<void> {
  const shop = await shopBySlugOrThrow(slug);
  // deleteMany, bukan delete: unfollow saat belum follow bukan error.
  await prisma.shopFollower.deleteMany({ where: { shopId: shop.id, userId } });
}

/**
 * Daftar shopId yang di-follow user. Dipakai FE untuk status tombol Follow
 * tanpa fetch penuh — pola yang sama dengan `/wishlist/ids` (M7-A1).
 */
export async function listFollowedShopIds(userId: string): Promise<string[]> {
  const rows = await prisma.shopFollower.findMany({
    where: { userId, shop: { deletedAt: null } },
    select: { shopId: true },
  });
  return rows.map((r) => r.shopId);
}

export async function listFollowedShops(
  userId: string,
  page: number,
  limit: number,
): Promise<FollowingResult> {
  const where = { userId, shop: { deletedAt: null } };

  const [total, rows] = await Promise.all([
    prisma.shopFollower.count({ where }),
    prisma.shopFollower.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: { shop: { select: SHOP_CARD_SELECT } },
    }),
  ]);

  return { items: rows.map((r) => r.shop), total, page, limit };
}
