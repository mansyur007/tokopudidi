import { apiFetch } from './client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  order: number;
  children?: Category[];
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    return await apiFetch<Category[]>('/api/v1/categories');
  } catch {
    // Fallback supaya halaman beranda tetap render walau API mati saat dev.
    return [];
  }
}
