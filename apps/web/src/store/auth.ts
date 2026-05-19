'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserPublic, AuthTokens } from '@tokopudidi/shared';

interface AuthState {
  user: UserPublic | null;
  tokens: AuthTokens | null;
  setAuth: (user: UserPublic, tokens: AuthTokens) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      setAuth: (user, tokens) => set({ user, tokens }),
      clearAuth: () => set({ user: null, tokens: null }),
    }),
    { name: 'tokopudidi-auth' },
  ),
);
