'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SmartImage } from '@/components/media/SmartImage';
import { ShopBadgeMark } from '@/components/shop/ShopBadgeMark';
import { useAuthStore, useAuthHydrated } from '@/store/auth';
import { useFollowStore } from '@/store/follow';
import { getFollowedShops, type FollowingResult } from '@/lib/api/follow';

const LIMIT = 20;

export default function TokoFavoritPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const hydrated = useAuthHydrated();
  const followedIds = useFollowStore((s) => s.ids);
  const refreshFollow = useFollowStore((s) => s.refresh);
  const toggleFollow = useFollowStore((s) => s.toggle);

  const [page, setPage] = useState(1);
  const [data, setData] = useState<FollowingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  useEffect(() => {
    // Tunggu sesi tersimpan terbaca dulu — tanpa ini pengikut toko yang membuka
    // /akun/toko-favorit lewat URL langsung dibuang ke /masuk. Lihat `useAuthHydrated`.
    if (!hydrated) return;
    if (!user) router.push('/masuk');
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    refreshFollow();
    getFollowedShops(token, page, LIMIT)
      .then(setData)
      .finally(() => setLoading(false));
  }, [token, page, refreshFollow]);

  // Sebelum layar "belum mengikuti toko mana pun": sebelum sesi terbaca daftarnya
  // memang kosong, jadi empty-state di situ cuma menyesatkan.
  if (!hydrated) return <div className="px-4 py-8 text-center text-sm text-gray-500">Memuat...</div>;
  if (!user) return null;

  async function handleUnfollow(shopId: string, slug: string) {
    if (busySlug) return;
    setBusySlug(slug);
    try {
      await toggleFollow(shopId, slug);
    } finally {
      setBusySlug(null);
    }
  }

  // Disaring lewat store — begitu unfollow, kartunya langsung hilang dari grid
  // tanpa memuat ulang halaman (pola halaman /wishlist).
  const visible = (data?.items ?? []).filter((s) => followedIds.has(s.id));
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="wrap py-4">
      <h1 className="text-lg font-bold mb-1">Toko Favorit</h1>
      <p className="text-sm text-ink-muted mb-4">Toko yang kamu ikuti.</p>

      {loading ? (
        <p className="text-sm text-ink-muted text-center py-12">Memuat toko favorit...</p>
      ) : visible.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-ink-muted mb-3">
            Kamu belum mengikuti toko mana pun.
          </p>
          <Link href="/" className="btn-primary inline-block">Cari Toko</Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((s) => (
            <li key={s.id} className="card p-3 flex items-center gap-3">
              <Link href={`/toko/${s.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0">
                  {s.logoUrl && (
                    <SmartImage src={s.logoUrl} alt={s.name} fill sizes="48px" className="object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-1">
                    <span className="truncate">{s.name}</span>
                    <ShopBadgeMark badge={s.badge} />
                  </p>
                  <p className="text-xs text-gray-500 truncate">📍 {s.city}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    ⭐ {s.ratingAvg.toFixed(1)} ({s.ratingCount}) • {s.totalSold} terjual
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => handleUnfollow(s.id, s.slug)}
                disabled={busySlug === s.slug}
                className="text-xs font-semibold px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 shrink-0"
              >
                Berhenti
              </button>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2 text-sm" aria-label="Pagination">
          {page > 1 && (
            <button type="button" onClick={() => setPage((p) => p - 1)} className="ghost-btn">
              Sebelumnya
            </button>
          )}
          <span className="text-ink-muted">Halaman {page} dari {totalPages}</span>
          {page < totalPages && (
            <button type="button" onClick={() => setPage((p) => p + 1)} className="ghost-btn">
              Berikutnya
            </button>
          )}
        </nav>
      )}
    </div>
  );
}
