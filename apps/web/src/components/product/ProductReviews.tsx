'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { timeAgo } from '@tokopudidi/shared';
import { listProductReviews, type ReviewItem } from '@/lib/api/reviews';

interface Props {
  productId: string;
  ratingAvg: number;
  ratingCount: number;
}

const FILTERS: Array<{ label: string; rating?: number; withImage?: boolean }> = [
  { label: 'Semua' },
  { label: 'Dengan foto', withImage: true },
  { label: '5⭐', rating: 5 },
  { label: '4⭐', rating: 4 },
  { label: '3⭐', rating: 3 },
  { label: '2⭐', rating: 2 },
  { label: '1⭐', rating: 1 },
];

export function ProductReviews({ productId, ratingAvg, ratingCount }: Props) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterIdx, setFilterIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const f = FILTERS[filterIdx];
    setLoading(true);
    listProductReviews(productId, { rating: f.rating, withImage: f.withImage, page })
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [productId, filterIdx, page]);

  function changeFilter(idx: number) {
    setFilterIdx(idx);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <section className="mt-2 px-4 py-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Ulasan ({ratingCount})</h2>
        <span className="text-sm">
          <span className="text-yellow-500">★</span> {ratingAvg.toFixed(1)} / 5
        </span>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {FILTERS.map((f, i) => (
          <button
            key={f.label}
            onClick={() => changeFilter(i)}
            className={clsx(
              'shrink-0 px-3 py-1.5 rounded-full text-xs border whitespace-nowrap',
              filterIdx === i
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-gray-300 text-gray-700',
            )}
          >
            {f.label}
          </button>
        ))}
      </nav>

      {loading && <p className="text-sm text-gray-500 py-4">Memuat ulasan...</p>}

      {!loading && items.length === 0 && (
        <p className="text-sm text-gray-500 py-6 text-center">
          Belum ada ulasan untuk filter ini.
        </p>
      )}

      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="border-b last:border-b-0 pb-3">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold shrink-0">
                {r.buyer.fullName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{r.buyer.fullName}</p>
                <p className="text-[11px] text-gray-500">{timeAgo(r.createdAt)}</p>
              </div>
              <span className="text-yellow-500 text-sm shrink-0">
                {'★'.repeat(r.rating)}<span className="text-gray-300">{'★'.repeat(5 - r.rating)}</span>
              </span>
            </div>
            {r.comment && <p className="text-sm mt-2 whitespace-pre-wrap">{r.comment}</p>}
            {r.imageUrls.length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {r.imageUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="w-16 h-16 rounded object-cover shrink-0" />
                ))}
              </div>
            )}
            {r.sellerReply && (
              <div className="mt-2 ml-10 bg-gray-50 px-3 py-2 rounded text-sm">
                <p className="text-[11px] text-gray-500">
                  Balasan Penjual{r.sellerRepliedAt ? ` · ${timeAgo(r.sellerRepliedAt)}` : ''}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap">{r.sellerReply}</p>
              </div>
            )}
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-outline text-sm px-3"
          >‹ Sebelumnya</button>
          <span className="text-xs text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn-outline text-sm px-3"
          >Berikutnya ›</button>
        </div>
      )}
    </section>
  );
}
