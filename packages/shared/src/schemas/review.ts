import { z } from 'zod';

export const createReviewSchema = z.object({
  orderItemId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional().or(z.literal('')),
  imageUrls: z.array(z.string().min(5)).max(3).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const sellerReplySchema = z.object({
  reply: z.string().trim().min(2, 'Balasan minimal 2 karakter').max(500),
});
