import { apiFetch } from './client';

export interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  order: number;
  placement: 'HOME_TOP' | 'HOME_MIDDLE' | 'CATEGORY_PAGE';
}

export async function fetchBanners(placement: Banner['placement'] = 'HOME_TOP'): Promise<Banner[]> {
  try {
    return await apiFetch<Banner[]>(`/api/v1/banners?placement=${placement}`);
  } catch {
    return [];
  }
}
