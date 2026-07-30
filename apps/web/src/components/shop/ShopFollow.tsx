'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useFollowStore } from '@/store/follow';

interface Props {
  shopId: string;
  shopSlug: string;
  /** Jumlah follower hasil render server — sudah termasuk user ini kalau dia follow. */
  initialFollowerCount: number;
}

/**
 * Tombol Follow/Mengikuti + jumlah follower di header toko (M13-A1).
 *
 * Status follow tidak bisa ikut SSR — token buyer hidup di localStorage,
 * sehingga request server-render tidak pernah membawanya — jadi datang dari
 * store. Angkanya lain cerita: `initialFollowerCount` sudah benar saat halaman
 * dirender, termasuk kalau user ini ada di dalamnya. Karena itu yang dilacak
 * di sini cuma **selisih akibat aksi user**, bukan tebakan siapa yang sudah
 * terhitung. Mengoreksi angka berdasarkan status follow yang baru datang
 * belakangan justru meleset satu setiap kali urutan datanya berbeda.
 */
export function ShopFollow({ shopId, shopSlug, initialFollowerCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const following = useFollowStore((s) => s.ids.has(shopId));
  const refresh = useFollowStore((s) => s.refresh);
  const toggle = useFollowStore((s) => s.toggle);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Selisih follower sejak halaman dirender; hanya bergerak saat aksi berhasil.
  const [delta, setDelta] = useState(0);

  useEffect(() => { refresh(); }, [user, refresh]);

  const count = Math.max(0, initialFollowerCount + delta);

  async function handleClick() {
    if (!user) {
      // Setelah login, kembalikan user ke halaman toko yang sedang dilihat.
      router.push(`/masuk?return=${encodeURIComponent(pathname)}`);
      return;
    }
    if (busy) return;
    const wasFollowing = following;
    setBusy(true);
    setError(null);
    try {
      await toggle(shopId, shopSlug);
      // Baru dihitung setelah server menerima — kalau gagal, store rollback
      // dan angkanya pun tidak pernah bergerak.
      setDelta((d) => d + (wasFollowing ? -1 : 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui follow');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-pressed={following}
        data-testid="follow-shop"
        className={
          following
            ? 'text-xs font-semibold px-3 py-1.5 rounded border border-primary text-primary hover:bg-primary-50 disabled:opacity-50'
            : 'text-xs font-semibold px-3 py-1.5 rounded bg-primary text-white hover:opacity-90 disabled:opacity-50'
        }
      >
        {following ? '✓ Mengikuti' : '+ Follow'}
      </button>
      <span className="text-xs text-gray-500" data-testid="follower-count">
        {count} pengikut
      </span>
      {error && <span className="text-xs text-red-600 max-w-[10rem] text-right">{error}</span>}
    </div>
  );
}
