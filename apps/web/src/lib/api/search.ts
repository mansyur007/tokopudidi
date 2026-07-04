import { apiFetch } from './client';

export interface SuggestResult {
  products: { id: string; name: string; slug: string; imageUrl: string | null }[];
  categories: { id: string; name: string; slug: string }[];
  shops: { id: string; name: string; slug: string; logoUrl: string | null }[];
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  searchedAt: string;
}

export function getSuggestions(q: string): Promise<SuggestResult> {
  return apiFetch<SuggestResult>(`/api/v1/search/suggest?q=${encodeURIComponent(q)}`);
}

export function getSearchHistory(token: string): Promise<SearchHistoryItem[]> {
  return apiFetch<SearchHistoryItem[]>('/api/v1/search/history?limit=5', { token });
}

export function addSearchHistory(token: string, query: string) {
  return apiFetch('/api/v1/search/history', {
    method: 'POST',
    token,
    body: JSON.stringify({ query }),
  });
}

export function removeSearchHistory(token: string, id: string) {
  return apiFetch(`/api/v1/search/history/${id}`, { method: 'DELETE', token });
}
