'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { getRecentProducts } from '@/lib/api/recentlyViewed';
import { ProductCard } from '@/components/product/ProductCard';
import type { ProductCard as ProductCardType } from '@/lib/api/products';

export function RecentlyViewed() {
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const [items, setItems] = useState<ProductCardType[]>([]);

  useEffect(() => {
    getRecentProducts(token, 10).then(setItems).catch(() => setItems([]));
  }, [token]);

  if (items.length === 0) return null;

  return (
    <section className="mt-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-extrabold text-ink">Baru Dilihat</h2>
        <Link href="/baru-dilihat" className="text-[12.5px] font-semibold text-primary no-underline">
          Lihat Semua
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {items.map((p) => (
          <div key={p.id} className="snap-start">
            <ProductCard product={p} variant="horizontal" />
          </div>
        ))}
      </div>
    </section>
  );
}
