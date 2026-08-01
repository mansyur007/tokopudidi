import { prisma } from '@tokopudidi/database';
import {
  broadcastCooldownRemainingMs,
  formatCooldownRemaining,
  type BroadcastCreateInput,
} from '@tokopudidi/shared';
import { BadRequestError, TooManyRequestsError } from '../../lib/errors';
import { logger } from '../../lib/logger';

// Notifikasi ditulis per potongan, bukan sekaligus: satu `createMany` berisi
// puluhan ribu baris menahan koneksi DB terlalu lama dan bisa melewati batas
// parameter query. 500 aman dan tetap sedikit round-trip.
const FANOUT_CHUNK = 500;

export interface BroadcastRecord {
  id: string;
  title: string;
  body: string;
  recipientCount: number;
  sentAt: Date;
  product: { slug: string; name: string } | null;
}

export interface BroadcastStatus {
  followerCount: number;
  lastSentAt: Date | null;
  cooldownRemainingMs: number;
  canSend: boolean;
}

const HISTORY_SELECT = {
  id: true,
  title: true,
  body: true,
  recipientCount: true,
  sentAt: true,
  product: { select: { slug: true, name: true } },
} as const;

/**
 * Follower yang berhak menerima broadcast.
 *
 * User yang sudah dihapus disaring di sini, bukan dibiarkan lewat: notifikasinya
 * tidak akan pernah dibaca, tapi ikut terhitung di `recipientCount` sehingga
 * angka jangkauan di riwayat jadi mengklaim lebih banyak daripada kenyataannya.
 */
function followerWhere(shopId: string) {
  return { shopId, user: { deletedAt: null } };
}

export async function getBroadcastStatus(shopId: string, now = new Date()): Promise<BroadcastStatus> {
  const [followerCount, last] = await Promise.all([
    prisma.shopFollower.count({ where: followerWhere(shopId) }),
    prisma.shopBroadcast.findFirst({
      where: { shopId },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    }),
  ]);

  const cooldownRemainingMs = broadcastCooldownRemainingMs(last?.sentAt ?? null, now);
  return {
    followerCount,
    lastSentAt: last?.sentAt ?? null,
    cooldownRemainingMs,
    canSend: cooldownRemainingMs === 0 && followerCount > 0,
  };
}

export async function listBroadcasts(
  shopId: string,
  page: number,
  limit: number,
): Promise<{ items: BroadcastRecord[]; total: number; page: number; limit: number }> {
  const [total, items] = await Promise.all([
    prisma.shopBroadcast.count({ where: { shopId } }),
    prisma.shopBroadcast.findMany({
      where: { shopId },
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: HISTORY_SELECT,
    }),
  ]);
  return { items, total, page, limit };
}

/**
 * Tulis baris riwayat kalau jeda 24 jam sudah lewat, dengan pemeriksaan dan
 * penulisan yang tidak bisa disisipi request kembar.
 *
 * Kenapa perlu kunci: "baca lalu tulis" biasa bocor persis pada kasus yang
 * paling mungkin terjadi — dua klik beruntun. Keduanya membaca "belum ada
 * broadcast" sebelum salah satunya sempat menulis, lalu keduanya lolos dan
 * follower menerima notifikasi dobel. `INSERT ... WHERE NOT EXISTS` pun tidak
 * menutup celah ini: pada isolasi READ COMMITTED (default Postgres) subquery-nya
 * tidak melihat baris transaksi lain yang belum commit. Advisory lock per toko
 * adalah yang benar-benar menyerialkan keduanya, dan hanya menahan pengirim ke
 * toko yang sama — toko lain tidak ikut antre.
 *
 * Melempar 429 kalau jedanya masih berjalan.
 */
async function insertAfterCooldown(params: {
  shopId: string;
  title: string;
  body: string;
  productId: string | null;
  recipientCount: number;
}): Promise<{ id: string; sentAt: Date }> {
  return prisma.$transaction(async (tx) => {
    // Kunci dilepas otomatis saat transaksi selesai (commit maupun rollback),
    // jadi lemparan di bawah tidak bisa meninggalkan toko dalam keadaan terkunci.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${params.shopId})::bigint)`;

    const last = await tx.shopBroadcast.findFirst({
      where: { shopId: params.shopId },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    });

    // Dibaca ulang DI DALAM kunci — pembacaan sebelum kunci hanya untuk pesan,
    // yang menentukan adalah yang ini.
    const remaining = broadcastCooldownRemainingMs(last?.sentAt ?? null);
    if (remaining > 0) {
      throw new TooManyRequestsError(
        `Kamu baru saja mengirim broadcast. Coba lagi dalam ${formatCooldownRemaining(remaining)}.`,
      );
    }

    return tx.shopBroadcast.create({
      data: {
        shopId: params.shopId,
        title: params.title,
        body: params.body,
        productId: params.productId,
        recipientCount: params.recipientCount,
      },
      select: { id: true, sentAt: true },
    });
  });
}

/**
 * Kirim notifikasi ke seluruh follower. Dijalankan **setelah** respons dibalas
 * (lihat route) — 1000 follower berarti 2 round-trip DB yang tidak ada
 * gunanya ditunggu seller di depan layar.
 *
 * Kegagalan di sini tidak bisa lagi mengubah respons, jadi ditangkap dan
 * dicatat: yang hilang adalah notifikasi, sedangkan baris riwayat (dan jeda 24
 * jamnya) sudah tertulis. Itu pilihan yang disengaja — lebih baik satu kiriman
 * gagal daripada jeda ikut hilang dan follower dibanjiri percobaan ulang.
 */
export async function fanOutBroadcast(params: {
  broadcastId: string;
  shopId: string;
  userIds: string[];
  title: string;
  body: string;
  linkUrl: string;
}): Promise<void> {
  let written = 0;
  try {
    for (let i = 0; i < params.userIds.length; i += FANOUT_CHUNK) {
      const chunk = params.userIds.slice(i, i + FANOUT_CHUNK);
      const res = await prisma.notification.createMany({
        data: chunk.map((userId) => ({
          userId,
          type: 'SHOP_BROADCAST' as const,
          title: params.title,
          body: params.body,
          linkUrl: params.linkUrl,
        })),
      });
      written += res.count;
    }
    logger.info(
      { broadcastId: params.broadcastId, shopId: params.shopId, written },
      'broadcast fan-out selesai',
    );
  } catch (err) {
    logger.error(
      { err, broadcastId: params.broadcastId, shopId: params.shopId, written },
      'broadcast fan-out gagal sebagian',
    );
  }
}

export interface CreateBroadcastResult {
  broadcast: BroadcastRecord;
  /** Dipanggil route setelah respons terkirim. */
  fanOut: () => Promise<void>;
}

export async function createBroadcast(
  shop: { id: string; slug: string },
  input: BroadcastCreateInput,
  now = new Date(),
): Promise<CreateBroadcastResult> {
  // Tolak lebih awal supaya request yang jelas kena jeda tidak sempat menarik
  // daftar follower dulu. Penegakan yang mengikat ada di dalam kunci
  // (insertAfterCooldown) — yang ini semata-mata jalan pintas.
  const status = await getBroadcastStatus(shop.id, now);
  if (status.cooldownRemainingMs > 0) {
    throw new TooManyRequestsError(
      `Kamu baru saja mengirim broadcast. Coba lagi dalam ${formatCooldownRemaining(status.cooldownRemainingMs)}.`,
    );
  }

  let product: { id: string; slug: string; name: string } | null = null;
  if (input.productId) {
    // `isActive` ikut disyaratkan, bukan hanya kepemilikan: broadcast tidak bisa
    // ditarik kembali, dan menautkan ribuan follower ke halaman produk yang
    // sedang dinonaktifkan berarti mengirim tautan mati sekali untuk selamanya.
    product = await prisma.product.findFirst({
      where: { id: input.productId, shopId: shop.id, deletedAt: null, isActive: true },
      select: { id: true, slug: true, name: true },
    });
    // Sengaja 400, bukan 404: dari sudut pandang seller ini payload yang salah
    // (produk toko lain / sudah dihapus), bukan halaman yang tidak ada.
    if (!product) {
      throw new BadRequestError('Produk tidak ditemukan di tokomu atau sedang nonaktif');
    }
  }

  const followers = await prisma.shopFollower.findMany({
    where: followerWhere(shop.id),
    select: { userId: true },
  });

  // Bukan "sukses tapi kosong": tanpa follower, broadcast tidak mengirim apa pun
  // sementara jeda 24 jamnya tetap terpakai — seller kehilangan jatah harinya
  // untuk pengiriman yang tidak pernah sampai ke siapa pun.
  if (followers.length === 0) {
    throw new BadRequestError(
      'Tokomu belum punya follower, jadi belum ada yang bisa dikirimi pengumuman.',
    );
  }

  const inserted = await insertAfterCooldown({
    shopId: shop.id,
    title: input.title,
    body: input.body,
    productId: product?.id ?? null,
    recipientCount: followers.length,
  });

  const linkUrl = product ? `/produk/${product.slug}` : `/toko/${shop.slug}`;
  const userIds = followers.map((f) => f.userId);

  return {
    broadcast: {
      id: inserted.id,
      title: input.title,
      body: input.body,
      recipientCount: followers.length,
      sentAt: inserted.sentAt,
      product: product ? { slug: product.slug, name: product.name } : null,
    },
    fanOut: () =>
      fanOutBroadcast({
        broadcastId: inserted.id,
        shopId: shop.id,
        userIds,
        title: input.title,
        body: input.body,
        linkUrl,
      }),
  };
}
