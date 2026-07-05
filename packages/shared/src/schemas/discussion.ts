import { z } from 'zod';

// M8-A3 — Diskusi Produk (Tanya Jawab Publik)

export const createDiscussionSchema = z.object({
  message: z.string().trim().min(3, 'Pertanyaan minimal 3 karakter').max(500, 'Maksimal 500 karakter'),
});
export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>;

export const replyDiscussionSchema = z.object({
  message: z.string().trim().min(2, 'Balasan minimal 2 karakter').max(500, 'Maksimal 500 karakter'),
});
export type ReplyDiscussionInput = z.infer<typeof replyDiscussionSchema>;

export const discussionSortValues = ['newest', 'helpful'] as const;
export type DiscussionSort = (typeof discussionSortValues)[number];

// Bentuk response (dipakai FE juga).
export interface DiscussionReply {
  id: string;
  message: string | null; // null = sudah dihapus (soft delete)
  userName: string;
  isSellerReply: boolean;
  isDeleted: boolean;
  isMine: boolean; // true kalau ditulis oleh user yang sedang login
  helpfulCount: number;
  myHelpful: boolean;
  createdAt: string;
}

export interface DiscussionNode extends DiscussionReply {
  replies: DiscussionReply[];
}

export interface DiscussionListResult {
  total: number; // jumlah pertanyaan root (bukan termasuk balasan)
  page: number;
  limit: number;
  items: DiscussionNode[];
}
