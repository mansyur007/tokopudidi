'use client';

import { create } from 'zustand';
import { getWishlistIds, addToWishlist, removeFromWishlist } from '@/lib/api/wishlist';
import { useAuthStore } from './auth';

interface WishlistState {
  ids: Set<string>;
  loading: boolean;
  has: (productId: string) => boolean;
  refresh: () => Promise<void>;
  toggle: (productId: string) => Promise<void>;
  clear: () => void;
}

function getToken(): string | null {
  return useAuthStore.getState().tokens?.accessToken ?? null;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: new Set(),
  loading: false,
  has: (productId) => get().ids.has(productId),
  refresh: async () => {
    const token = getToken();
    if (!token) { set({ ids: new Set() }); return; }
    set({ loading: true });
    try {
      const ids = await getWishlistIds(token);
      set({ ids: new Set(ids), loading: false });
    } catch {
      set({ loading: false });
    }
  },
  toggle: async (productId) => {
    const token = getToken();
    if (!token) throw new Error('Login dulu ya untuk simpan wishlist');
    const wasIn = get().ids.has(productId);
    // Optimistic update.
    set((s) => {
      const next = new Set(s.ids);
      if (wasIn) next.delete(productId); else next.add(productId);
      return { ids: next };
    });
    try {
      if (wasIn) await removeFromWishlist(token, productId);
      else await addToWishlist(token, productId);
    } catch (err) {
      // Rollback kalau gagal.
      set((s) => {
        const next = new Set(s.ids);
        if (wasIn) next.add(productId); else next.delete(productId);
        return { ids: next };
      });
      throw err;
    }
  },
  clear: () => set({ ids: new Set() }),
}));
