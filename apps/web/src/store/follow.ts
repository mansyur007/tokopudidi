'use client';

import { create } from 'zustand';
import { getFollowedShopIds, followShop, unfollowShop } from '@/lib/api/follow';
import { useAuthStore } from './auth';

interface FollowState {
  ids: Set<string>;
  has: (shopId: string) => boolean;
  refresh: () => Promise<void>;
  toggle: (shopId: string, slug: string) => Promise<void>;
  clear: () => void;
}

function getToken(): string | null {
  return useAuthStore.getState().tokens?.accessToken ?? null;
}

export const useFollowStore = create<FollowState>((set, get) => ({
  ids: new Set(),
  has: (shopId) => get().ids.has(shopId),
  refresh: async () => {
    const token = getToken();
    if (!token) { set({ ids: new Set() }); return; }
    try {
      const ids = await getFollowedShopIds(token);
      set({ ids: new Set(ids) });
    } catch {
      // Diam-diam: tombolnya cukup tampil sebagai "belum follow", jangan
      // menginterupsi halaman toko hanya karena status tombol gagal diambil.
    }
  },
  // Butuh dua kunci: `shopId` untuk state lokal (kartu toko hanya punya id),
  // `slug` untuk endpoint-nya.
  toggle: async (shopId, slug) => {
    const token = getToken();
    if (!token) throw new Error('Login dulu ya untuk follow toko');
    const wasIn = get().ids.has(shopId);
    // Optimistic update.
    set((s) => {
      const next = new Set(s.ids);
      if (wasIn) next.delete(shopId); else next.add(shopId);
      return { ids: next };
    });
    try {
      if (wasIn) await unfollowShop(token, slug);
      else await followShop(token, slug);
    } catch (err) {
      // Rollback kalau gagal.
      set((s) => {
        const next = new Set(s.ids);
        if (wasIn) next.add(shopId); else next.delete(shopId);
        return { ids: next };
      });
      throw err;
    }
  },
  clear: () => set({ ids: new Set() }),
}));
