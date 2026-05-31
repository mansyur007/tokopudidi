'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import { Icon } from '@/components/shell/Icon';
import type { ProductCard as ProductCardType } from '@/lib/api/products';

interface Props {
  forYou: ProductCardType[];
  mall: ProductCardType[];
  incaran: ProductCardType[];
}

const INITIAL = 18;
const STEP = 12;

const TABS = [
  { key: 'forYou', label: 'For You' },
  { key: 'mall',   label: 'Mall', badge: true },
  { key: 'incaran', label: 'Produk Incaranmu' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export function ProductFeed(props: Props) {
  const [tab, setTab] = useState<TabKey>('forYou');
  const [count, setCount] = useState(INITIAL);
  const [toast, setToast] = useState<string | null>(null);

  // Reset jumlah yang ditampilkan saat pindah tab.
  useEffect(() => { setCount(INITIAL); }, [tab]);

  // Auto-hilang toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const source = props[tab] ?? [];
  const visible = source.slice(0, count);
  const hasMore = count < source.length;

  return (
    <section className="mt-7">
      <div className="flex items-center gap-6 border-b border-line mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            data-active={tab === t.key}
            className="feed-tab shrink-0"
          >
            {'badge' in t && t.badge && (
              <span className="bg-primary text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded mr-1.5">
                MALL
              </span>
            )}
            {t.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-ink-muted text-center py-12">Belum ada produk di kategori ini.</p>
      ) : (
        <div className="feed-grid">
          {visible.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onAdded={(name) => setToast(`Ditambahkan ke keranjang: ${name}`)}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-7">
          <button type="button" onClick={() => setCount((c) => c + STEP)} className="load-more">
            Muat Lebih Banyak
          </button>
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 bg-ink text-white px-4 py-3 rounded-[10px] text-sm font-semibold flex items-center gap-2.5 shadow-toast max-w-[92vw]"
        >
          <span className="inline-grid place-items-center w-5 h-5 rounded-full bg-primary text-white">
            <Icon name="check" size={12} stroke={2.5} />
          </span>
          {toast}
        </div>
      )}
    </section>
  );
}
