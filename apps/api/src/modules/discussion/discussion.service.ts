import { prisma } from '@tokopudidi/database';
import type { DiscussionListResult, DiscussionNode, DiscussionReply, DiscussionSort } from '@tokopudidi/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors';

// Cek apakah user adalah pemilik toko dari produk ini.
async function isShopOwnerOfProduct(productId: string, userId: string): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { shop: { select: { ownerId: true } } },
  });
  return product?.shop.ownerId === userId;
}

type DiscussionRow = {
  id: string;
  userId: string;
  message: string;
  isSellerReply: boolean;
  helpfulCount: number;
  createdAt: Date;
  deletedAt: Date | null;
  user: { fullName: string };
};

function toReply(row: DiscussionRow, helpfulIds: Set<string>, viewerId?: string): DiscussionReply {
  const isDeleted = row.deletedAt !== null;
  return {
    id: row.id,
    message: isDeleted ? null : row.message,
    userName: row.user.fullName,
    isSellerReply: row.isSellerReply,
    isDeleted,
    isMine: viewerId != null && row.userId === viewerId,
    helpfulCount: row.helpfulCount,
    myHelpful: helpfulIds.has(row.id),
    createdAt: row.createdAt.toISOString(),
  };
}

const rowSelect = {
  id: true,
  userId: true,
  message: true,
  isSellerReply: true,
  helpfulCount: true,
  createdAt: true,
  deletedAt: true,
  user: { select: { fullName: true } },
} as const;

export async function listDiscussions(
  productId: string,
  opts: { sort: DiscussionSort; page: number; limit: number; userId?: string },
): Promise<DiscussionListResult> {
  const orderBy =
    opts.sort === 'helpful'
      ? [{ helpfulCount: 'desc' as const }, { createdAt: 'desc' as const }]
      : [{ createdAt: 'desc' as const }];

  const [total, roots] = await Promise.all([
    prisma.discussion.count({ where: { productId, parentId: null } }),
    prisma.discussion.findMany({
      where: { productId, parentId: null },
      orderBy,
      skip: (opts.page - 1) * opts.limit,
      take: opts.limit,
      select: rowSelect,
    }),
  ]);

  const rootIds = roots.map((r) => r.id);
  const replies = rootIds.length
    ? await prisma.discussion.findMany({
        where: { parentId: { in: rootIds } },
        orderBy: { createdAt: 'asc' },
        select: { ...rowSelect, parentId: true },
      })
    : [];

  // Tandai mana yang sudah di-"helpful" oleh user login (root + replies sekaligus).
  let helpfulIds = new Set<string>();
  if (opts.userId) {
    const allIds = [...rootIds, ...replies.map((r) => r.id)];
    if (allIds.length) {
      const marks = await prisma.discussionHelpful.findMany({
        where: { userId: opts.userId, discussionId: { in: allIds } },
        select: { discussionId: true },
      });
      helpfulIds = new Set(marks.map((m) => m.discussionId));
    }
  }

  const repliesByParent = new Map<string, DiscussionReply[]>();
  for (const r of replies) {
    const list = repliesByParent.get(r.parentId!) ?? [];
    list.push(toReply(r, helpfulIds, opts.userId));
    repliesByParent.set(r.parentId!, list);
  }

  const items: DiscussionNode[] = roots.map((root) => ({
    ...toReply(root, helpfulIds, opts.userId),
    replies: repliesByParent.get(root.id) ?? [],
  }));

  return { total, page: opts.page, limit: opts.limit, items };
}

export async function createQuestion(productId: string, userId: string, message: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, slug: true, shop: { select: { ownerId: true } } },
  });
  if (!product) throw new NotFoundError('Produk tidak ditemukan');

  // Pemilik toko yang bertanya di produknya sendiri langsung ditandai penjual.
  const isSeller = product.shop.ownerId === userId;

  const discussion = await prisma.discussion.create({
    data: { productId, userId, message, isSellerReply: isSeller },
  });

  // Notifikasi ke pemilik toko untuk pertanyaan baru (bukan dari dirinya sendiri).
  if (!isSeller) {
    await prisma.notification.create({
      data: {
        userId: product.shop.ownerId,
        type: 'NEW_QUESTION',
        title: 'Pertanyaan baru di produkmu',
        body: `Ada yang bertanya tentang "${product.name}".`,
        linkUrl: `/produk/${product.slug}`,
      },
    });
  }

  return discussion;
}

export async function createReply(discussionId: string, userId: string, message: string) {
  const parent = await prisma.discussion.findUnique({
    where: { id: discussionId },
    select: { id: true, productId: true, parentId: true, userId: true },
  });
  if (!parent) throw new NotFoundError('Diskusi tidak ditemukan');
  // Balasan hanya 1 level — balas ke root, bukan ke balasan.
  const rootId = parent.parentId ?? parent.id;

  const productId = parent.productId;
  const isSeller = await isShopOwnerOfProduct(productId, userId);

  const reply = await prisma.discussion.create({
    data: { productId, userId, parentId: rootId, message, isSellerReply: isSeller },
  });

  // Notifikasi ke penanya asli kalau dibalas orang lain.
  const root = await prisma.discussion.findUnique({
    where: { id: rootId },
    select: { userId: true, product: { select: { slug: true, name: true } } },
  });
  if (root && root.userId !== userId) {
    await prisma.notification.create({
      data: {
        userId: root.userId,
        type: 'NEW_QUESTION',
        title: 'Pertanyaanmu dibalas',
        body: `Ada balasan untuk pertanyaanmu di "${root.product.name}".`,
        linkUrl: `/produk/${root.product.slug}`,
      },
    });
  }

  return reply;
}

export async function toggleHelpful(discussionId: string, userId: string): Promise<{ helpful: boolean; helpfulCount: number }> {
  const discussion = await prisma.discussion.findUnique({
    where: { id: discussionId },
    select: { id: true },
  });
  if (!discussion) throw new NotFoundError('Diskusi tidak ditemukan');

  const existing = await prisma.discussionHelpful.findUnique({
    where: { discussionId_userId: { discussionId, userId } },
  });

  const updated = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.discussionHelpful.delete({ where: { discussionId_userId: { discussionId, userId } } });
      return tx.discussion.update({
        where: { id: discussionId },
        data: { helpfulCount: { decrement: 1 } },
        select: { helpfulCount: true },
      });
    }
    await tx.discussionHelpful.create({ data: { discussionId, userId } });
    return tx.discussion.update({
      where: { id: discussionId },
      data: { helpfulCount: { increment: 1 } },
      select: { helpfulCount: true },
    });
  });

  return { helpful: !existing, helpfulCount: updated.helpfulCount };
}

export async function deleteDiscussion(discussionId: string, userId: string, role: string) {
  const discussion = await prisma.discussion.findUnique({
    where: { id: discussionId },
    select: { id: true, userId: true, deletedAt: true, productId: true },
  });
  if (!discussion) throw new NotFoundError('Diskusi tidak ditemukan');
  if (discussion.deletedAt) return; // sudah dihapus, idempoten

  const isOwner = discussion.userId === userId;
  const isAdmin = role === 'ADMIN';
  const isSeller = await isShopOwnerOfProduct(discussion.productId, userId);
  if (!isOwner && !isAdmin && !isSeller) {
    throw new ForbiddenError('Kamu tidak bisa menghapus diskusi ini');
  }

  await prisma.discussion.update({
    where: { id: discussionId },
    data: { deletedAt: new Date() },
  });
}
