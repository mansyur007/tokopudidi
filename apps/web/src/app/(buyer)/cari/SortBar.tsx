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

  // Filter rating & kondisi pindah ke FilterSidebar (M10-A10) supaya semua filter
  // hidup di satu tempat; bar ini fokus ke sortir saja.
  return (
    <div className="card p-3">
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
  );
}
