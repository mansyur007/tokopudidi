'use client';

import { create } from 'zustand';
import {
  getCart,
  addCartItem,
  updateCartItem,
  deleteCartItem,
  type CartResponse,
} from '@/lib/api/cart';
import { useAuthStore } from './auth';

interface CartState {
  data: CartResponse | null;
  loading: boolean;
  error: string | null;
  // Total quantity untuk badge — dihitung dari items.
  totalQuantity: () => number;
  refresh: () => Promise<void>;
  add: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  update: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  clear: () => void;
}

function getToken(): string | null {
  return useAuthStore.getState().tokens?.accessToken ?? null;
}

export const useCartStore = create<CartState>((set, get) => ({
  data: null,
  loading: false,
  error: null,
  totalQuantity: () => {
    const items = get().data?.items;
    if (!items) return 0;
    return items.reduce((sum, it) => sum + it.quantity, 0);
  },
  refresh: async () => {
    const token = getToken();
    if (!token) {
      set({ data: { items: [], grouped: [] } });
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await getCart(token);
      set({ data, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Gagal muat keranjang' });
    }
  },
  add: async (productId, quantity, variantId) => {
    const token = getToken();
    if (!token) throw new Error('Login dulu ya untuk menambah ke keranjang');
    await addCartItem(token, { productId, quantity, variantId });
    await get().refresh();
  },
  update: async (itemId, quantity) => {
    const token = getToken();
    if (!token) return;
    await updateCartItem(token, itemId, quantity);
    await get().refresh();
  },
  remove: async (itemId) => {
    const token = getToken();
    if (!token) return;
    await deleteCartItem(token, itemId);
    await get().refresh();
  },
  clear: () => set({ data: null, error: null }),
}));
