'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ProductListParams } from '@/lib/api/products';

type Sort = NonNullable<ProductListParams['sort']>;

interface Props {
  currentSort: Sort;
  labels: Record<Sort, string>;
}

export function SortBar({ currentSort, labels }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function applySort(s: Sort) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('sort', s);
    sp.delete('page');
    router.push(`/cari?${sp.toString()}`);
  }

  function applyFilter(key: string, value: string | null) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    sp.delete('page');
    router.push(`/cari?${sp.toString()}`);
  }

  const minRating = searchParams.get('minRating') ?? '';
  const condition = searchParams.get('condition') ?? '';

  return (
    <div className="card p-3 space-y-3">
      {/* Sortir */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Urutkan</p>
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {(Object.keys(labels) as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => applySort(s)}
              className={
                'shrink-0 px-3 py-1.5 rounded-full text-sm border ' +
                (currentSort === s
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-gray-300 text-gray-700')
              }
            >
              {labels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Filter cepat */}
      <div className="flex flex-wrap gap-2 text-sm">
        <select
          aria-label="Rating minimum"
          value={minRating}
          onChange={(e) => applyFilter('minRating', e.target.value || null)}
          className="input min-h-[40px] flex-1 min-w-[140px]"
        >
          <option value="">Rating: semua</option>
          <option value="4">4 ke atas</option>
          <option value="3">3 ke atas</option>
        </select>
        <select
          aria-label="Kondisi"
          value={condition}
          onChange={(e) => applyFilter('condition', e.target.value || null)}
          className="input min-h-[40px] flex-1 min-w-[140px]"
        >
          <option value="">Kondisi: semua</option>
          <option value="NEW">Baru</option>
          <option value="USED">Bekas</option>
        </select>
      </div>
    </div>
  );
}
