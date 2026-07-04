'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { getRecentProducts, removeRecentProduct } from '@/lib/api/recentlyViewed';
import { ProductCard } from '@/components/product/ProductCard';
import type { ProductCard as ProductCardType } from '@/lib/api/products';

export default function BaruDilihatPage() {
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const [items, setItems] = useState<ProductCardType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentProducts(token, 30)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [token]);

  async function remove(productId: string) {
    setItems((prev) => prev.filter((p) => p.id !== productId));
    await removeRecentProduct(productId, token).catch(() => undefined);
  }

  return (
    <div className="wrap py-4">
      <h1 className="text-lg font-bold mb-1">Baru Dilihat</h1>
      <p className="text-sm text-ink-muted mb-4">Produk yang baru saja kamu lihat.</p>

      {loading ? (
        <p className="text-sm text-ink-muted text-center py-12">Memuat...</p>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ink-muted mb-3">Belum ada produk yang kamu lihat.</p>
          <a href="/" className="btn-primary inline-flex">Cari Produk</a>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((p) => (
            <div key={p.id} className="relative">
              <ProductCard product={p} />
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="absolute top-2 left-2 w-[26px] h-[26px] rounded-full bg-ink/70 text-white grid place-items-center text-xs z-10"
                aria-label={`Hapus ${p.name} dari riwayat`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
