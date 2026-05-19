import { prisma } from '@tokopudidi/database';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../lib/errors';

// Resolve atau buat room baru antara buyer dan shop. Idempotent.
export async function getOrCreateRoom(buyerId: string, shopId: string) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new NotFoundError('Toko tidak ditemukan');
  if (shop.ownerId === buyerId) {
    throw new BadRequestError('Tidak bisa chat dengan toko sendiri');
  }
  return prisma.chatRoom.upsert({
    where: { buyerId_shopId: { buyerId, shopId } },
    update: {},
    create: { buyerId, shopId },
  });
}

// List room untuk buyer.
export async function listRoomsForBuyer(buyerId: string) {
  return prisma.chatRoom.findMany({
    where: { buyerId },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      shop: { select: { id: true, name: true, slug: true, logoUrl: true, ownerId: true, isOpen: true } },
      messages: { orderBy: { sentAt: 'desc' }, take: 1 },
    },
  });
}

// List room untuk seller — filter by ownerId.
export async function listRoomsForSeller(ownerId: string) {
  const shop = await prisma.shop.findUnique({ where: { ownerId } });
  if (!shop) return [];
  return prisma.chatRoom.findMany({
    where: { shopId: shop.id },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      buyer: { select: { id: true, fullName: true, avatarUrl: true } },
      messages: { orderBy: { sentAt: 'desc' }, take: 1 },
    },
  });
}

async function getRoomFor(userId: string, roomId: string) {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { shop: { select: { ownerId: true, isOpen: true, autoReplyText: true, name: true } } },
  });
  if (!room) throw new NotFoundError('Chat room tidak ditemukan');
  if (room.buyerId !== userId && room.shop.ownerId !== userId) {
    throw new ForbiddenError('Kamu tidak punya akses ke chat ini');
  }
  return room;
}

export async function getMessages(userId: string, roomId: string, limit = 50) {
  const room = await getRoomFor(userId, roomId);
  return prisma.chatMessage.findMany({
    where: { roomId: room.id },
    orderBy: { sentAt: 'asc' },
    take: limit,
  });
}

export async function sendMessage(
  userId: string,
  roomId: string,
  data: { content: string; imageUrl?: string },
) {
  const room = await getRoomFor(userId, roomId);
  const msg = await prisma.chatMessage.create({
    data: {
      roomId: room.id,
      senderId: userId,
      content: data.content,
      imageUrl: data.imageUrl || null,
    },
  });
  await prisma.chatRoom.update({
    where: { id: room.id },
    data: { lastMessageAt: new Date() },
  });

  // Notif untuk lawan bicara.
  const recipientId = userId === room.buyerId ? room.shop.ownerId : room.buyerId;
  await prisma.notification.create({
    data: {
      userId: recipientId,
      type: 'NEW_MESSAGE',
      title: 'Ada pesan baru',
      body: data.content.slice(0, 100) || '[Gambar]',
      linkUrl: userId === room.buyerId ? `/seller/chat?room=${room.id}` : `/chat?room=${room.id}`,
    },
  }).catch(() => undefined);

  // Auto-reply: kalau seller offline & toko tutup, buyer kirim → auto-reply text.
  let autoReply: typeof msg | null = null;
  if (userId === room.buyerId && !room.shop.isOpen && room.shop.autoReplyText) {
    autoReply = await prisma.chatMessage.create({
      data: {
        roomId: room.id,
        senderId: room.shop.ownerId,
        content: room.shop.autoReplyText,
      },
    });
    await prisma.chatRoom.update({
      where: { id: room.id },
      data: { lastMessageAt: new Date() },
    });
  }

  return { message: msg, autoReply };
}

export async function markRead(userId: string, roomId: string) {
  const room = await getRoomFor(userId, roomId);
  await prisma.chatMessage.updateMany({
    where: { roomId: room.id, readAt: null, senderId: { not: userId } },
    data: { readAt: new Date() },
  });
}
