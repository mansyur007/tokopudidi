import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().trim().max(2000),
  imageUrl: z.string().min(5).optional().or(z.literal('')),
}).refine((d) => d.content.length > 0 || (d.imageUrl && d.imageUrl.length > 0), {
  message: 'Pesan tidak boleh kosong',
  path: ['content'],
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const openRoomSchema = z.object({
  shopId: z.string().uuid(),
});
