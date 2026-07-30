'use client';

import { useEffect, useState } from 'react';
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

/**
 * `true` hanya setelah sesi tersimpan benar-benar terbaca oleh React.
 *
 * WAJIB dipakai sebelum menyimpulkan "belum login". Tanpa ini, guard halaman
 * membuang user yang sudah masuk ke /masuk setiap kali halaman dimuat ulang
 * atau dibuka lewat URL langsung — navigasi dari dalam aplikasi tetap jalan,
 * itu sebabnya jenis bug ini gampang luput.
 *
 * Kenapa flag-nya dari effect, bukan sekadar `persist.hasHydrated()`:
 * `zustand` memberi React `getInitialState` sebagai *server snapshot*
 * (lihat `useStore` di zustand v4), dan React memakai snapshot itu untuk
 * SELURUH render hidrasi. Jadi pada render pertama di klien `user` pasti
 * `null` — kondisi awal store, bukan isi localStorage — walaupun
 * `hasHydrated()` sudah `true` (localStorage sinkron, rehydrate-nya selesai
 * saat modul store dievaluasi). Artinya membaca `hasHydrated()` di badan
 * render tidak menolong sama sekali; yang menandakan snapshot asli sudah
 * dipakai adalah commit pertama, yaitu effect ini.
 *
 * Efek sampingnya bagus: markup server dan render hidrasi jadi sama-sama
 * "Memuat...", sehingga hydration mismatch yang selama ini terjadi di shell
 * admin/seller ikut hilang.
 */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // `persist` tidak ada kalau storage-nya gagal diakses (Safari private
    // mode, localStorage dimatikan). Di situ tidak akan pernah ada sesi yang
    // menyusul, jadi anggap selesai — jangan biarkan layar "Memuat..." abadi.
    const store: typeof useAuthStore.persist | undefined = useAuthStore.persist;
    if (!store) { setHydrated(true); return; }
    if (store.hasHydrated()) { setHydrated(true); return; }
    // Storage asinkron / `rehydrate()` manual: tunggu sampai benar-benar rampung.
    return store.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
