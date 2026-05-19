// Socket.IO server: auth via JWT, event message:new + message:read + typing.
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { prisma } from '@tokopudidi/database';
import { verifyAccessToken } from '../../lib/jwt';
import { logger } from '../../lib/logger';

let ioInstance: Server | null = null;

export function attachSocketServer(httpServer: HttpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:3000'],
      credentials: true,
    },
  });

  // JWT auth — token diberikan di handshake.auth.token.
  ioInstance.use((socket, next) => {
    const token = (socket.handshake.auth?.token as string) || (socket.handshake.query?.token as string);
    if (!token) return next(new Error('Tidak ada token'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Token tidak valid'));
    }
  });

  ioInstance.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    logger.debug({ userId, sid: socket.id }, '🔌 socket connected');

    socket.on('room:join', async (roomId: string) => {
      // Validasi: user adalah buyer atau owner shop dari room ini.
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        include: { shop: { select: { ownerId: true } } },
      });
      if (!room) return;
      if (room.buyerId !== userId && room.shop.ownerId !== userId) return;
      socket.join(`room:${roomId}`);
    });

    socket.on('room:leave', (roomId: string) => {
      socket.leave(`room:${roomId}`);
    });

    socket.on('typing', (roomId: string) => {
      socket.to(`room:${roomId}`).emit('typing', { userId });
    });

    socket.on('disconnect', () => {
      logger.debug({ userId, sid: socket.id }, '🔌 socket disconnected');
    });
  });
}

export function emitToRoom(roomId: string, event: string, payload: unknown) {
  if (!ioInstance) return;
  ioInstance.to(`room:${roomId}`).emit(event, payload);
}
