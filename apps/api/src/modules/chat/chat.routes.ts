import { Router } from 'express';
import { sendMessageSchema, openRoomSchema } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import {
  getOrCreateRoom,
  listRoomsForBuyer,
  listRoomsForSeller,
  getMessages,
  sendMessage,
  markRead,
} from './chat.service';
import { emitToRoom } from './chat.realtime';

export const chatRouter = Router();
chatRouter.use(requireAuth);

// GET /api/v1/chats/rooms — auto: kalau role=SELLER+ADMIN punya shop, list shop rooms; kalau buyer, list buyer rooms.
chatRouter.get('/rooms', async (req, res, next) => {
  try {
    const role = req.user!.role;
    const items = role === 'BUYER'
      ? await listRoomsForBuyer(req.user!.sub)
      : await listRoomsForSeller(req.user!.sub);
    return ok(res, items);
  } catch (err) { next(err); }
});

// POST /api/v1/chats/rooms — buyer buka room baru ke shop.
chatRouter.post('/rooms', validateBody(openRoomSchema), async (req, res, next) => {
  try {
    const room = await getOrCreateRoom(req.user!.sub, req.body.shopId);
    return created(res, room);
  } catch (err) { next(err); }
});

// GET /api/v1/chats/rooms/:id/messages
chatRouter.get('/rooms/:id/messages', async (req, res, next) => {
  try {
    const messages = await getMessages(req.user!.sub, req.params.id);
    await markRead(req.user!.sub, req.params.id);
    return ok(res, messages);
  } catch (err) { next(err); }
});

// POST /api/v1/chats/rooms/:id/messages
chatRouter.post(
  '/rooms/:id/messages',
  validateBody(sendMessageSchema),
  async (req, res, next) => {
    try {
      const { message, autoReply } = await sendMessage(req.user!.sub, req.params.id, req.body);
      // Emit realtime ke kedua peer.
      emitToRoom(req.params.id, 'message:new', message);
      if (autoReply) emitToRoom(req.params.id, 'message:new', autoReply);
      return created(res, { message, autoReply });
    } catch (err) { next(err); }
  },
);

// POST /api/v1/chats/rooms/:id/read
chatRouter.post('/rooms/:id/read', async (req, res, next) => {
  try {
    await markRead(req.user!.sub, req.params.id);
    emitToRoom(req.params.id, 'message:read', { userId: req.user!.sub });
    return ok(res, null);
  } catch (err) { next(err); }
});
