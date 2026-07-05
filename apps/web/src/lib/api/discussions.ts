import { apiFetch } from './client';
import type { DiscussionListResult, DiscussionSort } from '@tokopudidi/shared';

// M8-A3 — Diskusi Produk (Tanya Jawab Publik)

export function listDiscussions(
  productId: string,
  opts: { sort?: DiscussionSort; page?: number; token?: string } = {},
): Promise<DiscussionListResult> {
  const sp = new URLSearchParams();
  if (opts.sort) sp.set('sort', opts.sort);
  if (opts.page) sp.set('page', String(opts.page));
  const qs = sp.toString();
  return apiFetch<DiscussionListResult>(
    `/api/v1/products/${productId}/discussions${qs ? `?${qs}` : ''}`,
    { token: opts.token },
  );
}

export function askQuestion(productId: string, message: string, token: string): Promise<{ id: string }> {
  return apiFetch(`/api/v1/products/${productId}/discussions`, {
    method: 'POST',
    token,
    body: JSON.stringify({ message }),
  });
}

export function replyDiscussion(discussionId: string, message: string, token: string): Promise<{ id: string }> {
  return apiFetch(`/api/v1/discussions/${discussionId}/reply`, {
    method: 'POST',
    token,
    body: JSON.stringify({ message }),
  });
}

export function toggleHelpful(
  discussionId: string,
  token: string,
): Promise<{ helpful: boolean; helpfulCount: number }> {
  return apiFetch(`/api/v1/discussions/${discussionId}/helpful`, { method: 'POST', token });
}

export function deleteDiscussion(discussionId: string, token: string): Promise<null> {
  return apiFetch(`/api/v1/discussions/${discussionId}`, { method: 'DELETE', token });
}
