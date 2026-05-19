import { apiFetch } from './client';
import type { CreateReviewInput } from '@tokopudidi/shared';

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  imageUrls: string[];
  sellerReply: string | null;
  sellerRepliedAt: string | null;
  isHidden: boolean;
  createdAt: string;
  buyer: { fullName: string; avatarUrl?: string | null };
  product?: { name: string; slug: string };
}

export const listProductReviews = (productId: string, params: { rating?: number; withImage?: boolean; page?: number } = {}) => {
  const sp = new URLSearchParams();
  if (params.rating) sp.set('rating', String(params.rating));
  if (params.withImage) sp.set('withImage', 'true');
  if (params.page) sp.set('page', String(params.page));
  return apiFetch<{ items: ReviewItem[]; total: number; page: number; limit: number }>(
    `/api/v1/reviews/products/${productId}?${sp.toString()}`,
  );
};

export const listShopReviews = (shopId: string, page = 1, rating?: number) =>
  apiFetch<{ items: ReviewItem[]; total: number; page: number; limit: number }>(
    `/api/v1/reviews/shops/${shopId}?page=${page}${rating ? `&rating=${rating}` : ''}`,
  );

export const createReview = (token: string, body: CreateReviewInput) =>
  apiFetch('/api/v1/reviews', {
    method: 'POST', token, body: JSON.stringify(body),
  });

export interface ReviewableItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  variantName: string | null;
  order: { id: string; orderNumber: string; completedAt: string; shop: { name: string; slug: string } };
}

export const getPendingReviews = (token: string) =>
  apiFetch<ReviewableItem[]>('/api/v1/reviews/me/pending', { token });

export const replyReview = (token: string, reviewId: string, reply: string) =>
  apiFetch(`/api/v1/reviews/${reviewId}/reply`, {
    method: 'POST', token, body: JSON.stringify({ reply }),
  });
