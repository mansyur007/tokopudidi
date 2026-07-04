'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useWishlistStore } from '@/store/wishlist';
import { getWishlist, type WishlistResult } from '@/lib/api/wishlist';
import { ProductGrid } from '@/components/product/ProductGrid';

const LIMIT = 20;

export default function WishlistPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const wishlistIds = useWishlistStore((s) => s.ids);
  const refreshWishlist = useWishlistStore((s) => s.refresh);

  const [page, setPage] = useState(1);
  const [data, setData] = useState<WishlistResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) router.push('/masuk');
  }, [user, router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    refreshWishlist();
    getWishlist(token, page, LIMIT)
      .then(setData)
      .finally(() => setLoading(false));
  }, [token, page, refreshWishlist]);

  if (!user) return null;

  // Filter berdasarkan store — begitu hati di-unfollow, produk langsung hilang dari grid.
  const visibleItems = (data?.items ?? []).filter((p) => wishlistIds.has(p.id));
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="wrap py-4">
      <h1 className="text-lg font-bold mb-1">Wishlist</h1>
      <p className="text-sm text-ink-muted mb-4">Produk yang kamu simpan untuk dibeli nanti.</p>

      {loading ? (
        <p className="text-sm text-ink-muted text-center py-12">Memuat wishlist...</p>
      ) : (
        <ProductGrid
          items={visibleItems}
          emptyText="Wishlist kamu masih kosong. Yuk simpan produk favoritmu!"
          emptyCta={{ href: '/', label: 'Cari Produk' }}
        />
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
