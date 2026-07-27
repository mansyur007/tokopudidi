'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CityOption } from '@/lib/api/products';

/** Kunci yang dikelola sidebar ini — dipakai juga oleh tombol Reset. */
const FILTER_KEYS = [
  'minPrice', 'maxPrice', 'minRating', 'condition',
  'cities', 'officialStoreOnly', 'freeShipping', 'cod',
] as const;

interface Props {
  cities: CityOption[];
  /** Jumlah produk pada hasil sekarang — ditampilkan di header sidebar. */
  totalHasil: number;
}

function Group({ title, children, defaultOpen = true }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="border-b border-gray-200 last:border-0 py-2">
      <summary className="cursor-pointer text-sm font-medium py-1 select-none">{title}</summary>
      <div className="pt-2 pb-1 space-y-2">{children}</div>
    </details>
  );
}

export function FilterSidebar({ cities, totalHasil }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedCities = (searchParams.get('cities') ?? '').split(',').filter(Boolean);
  const minRating = searchParams.get('minRating') ?? '';
  const condition = searchParams.get('condition') ?? '';

  // Harga pakai state lokal supaya tidak menembak request tiap ketikan.
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') ?? '');

  const adaFilterAktif = FILTER_KEYS.some((k) => searchParams.get(k));

  /** Tulis ulang URL — selalu reset ke halaman 1 karena hasilnya berubah. */
  function apply(changes: Record<string, string | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    sp.delete('page');
    router.push(`/cari?${sp.toString()}`);
  }

  function toggleCity(city: string) {
    const next = selectedCities.includes(city)
      ? selectedCities.filter((c) => c !== city)
      : [...selectedCities, city];
    apply({ cities: next.join(',') || null });
  }

  function toggleBool(key: 'officialStoreOnly' | 'freeShipping' | 'cod') {
    apply({ [key]: searchParams.get(key) ? null : 'true' });
  }

  function resetAll() {
    setMinPrice('');
    setMaxPrice('');
    apply(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])));
  }

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-200">
        <div>
          <p className="text-sm font-semibold">Filter</p>
          <p className="text-xs text-gray-500">{totalHasil} produk</p>
        </div>
        {adaFilterAktif && (
          <button onClick={resetAll} className="text-xs text-primary underline">
            Reset Filter
          </button>
        )}
      </div>

      <Group title="Harga">
        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min"
            aria-label="Harga minimum"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="input min-h-[36px] text-sm w-full"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Maks"
            aria-label="Harga maksimum"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="input min-h-[36px] text-sm w-full"
          />
        </div>
        <button
          onClick={() => apply({ minPrice: minPrice || null, maxPrice: maxPrice || null })}
          className="btn-outline w-full text-sm py-1.5"
        >
          Terapkan Harga
        </button>
      </Group>

      <Group title="Kondisi">
        {[
          { value: '', label: 'Semua' },
          { value: 'NEW', label: 'Baru' },
          { value: 'USED', label: 'Bekas' },
        ].map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="condition"
              checked={condition === opt.value}
              onChange={() => apply({ condition: opt.value || null })}
            />
            {opt.label}
          </label>
        ))}
      </Group>

      <Group title="Rating">
        {[
          { value: '', label: 'Semua rating' },
          { value: '4', label: '4 ★ ke atas' },
          { value: '3', label: '3 ★ ke atas' },
          { value: '2', label: '2 ★ ke atas' },
        ].map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="minRating"
              checked={minRating === opt.value}
              onChange={() => apply({ minRating: opt.value || null })}
            />
            {opt.label}
          </label>
        ))}
      </Group>

      {cities.length > 0 && (
        <Group title="Lokasi" defaultOpen={false}>
          {/* Daftar bisa panjang — batasi tingginya supaya sidebar tetap terbaca. */}
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {cities.map((c) => (
              <label key={c.city} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCities.includes(c.city)}
                  onChange={() => toggleCity(c.city)}
                />
                <span className="flex-1 truncate">{c.city}</span>
                <span className="text-xs text-gray-400">{c.count}</span>
              </label>
            ))}
          </div>
        </Group>
      )}

      <Group title="Lainnya">
        {([
          { key: 'officialStoreOnly', label: 'Official Store' },
          { key: 'freeShipping', label: 'Bebas Ongkir' },
          { key: 'cod', label: 'Bisa COD' },
        ] as const).map((opt) => (
          <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={!!searchParams.get(opt.key)}
              onChange={() => toggleBool(opt.key)}
            />
            {opt.label}
          </label>
        ))}
      </Group>
    </div>
  );
}
