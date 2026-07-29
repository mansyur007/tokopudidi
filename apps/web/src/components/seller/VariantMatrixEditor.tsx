'use client';

import { useMemo } from 'react';
import {
  cartesian, comboKey, comboLabel, countCombinations,
  MAX_VARIANT_OPTIONS, MAX_VARIANT_COMBINATIONS,
} from '@tokopudidi/shared';

export interface OptionState { name: string; values: string[] }
export interface ComboState { values: string[]; priceModifier: number; stock: number }

interface Props {
  options: OptionState[];
  combos: ComboState[];
  onChange: (next: { options: OptionState[]; combos: ComboState[] }) => void;
}

/**
 * Editor varian multi-axis (M11-A8): definisikan opsi + nilainya, lalu isi
 * stok/selisih harga per kombinasi.
 *
 * Kombinasi TIDAK di-generate ulang dari nol setiap kali opsi berubah — nilai
 * yang sudah diisi dicocokkan lewat `comboKey` dan dipertahankan. Kalau
 * di-regenerate, seller yang menambah satu ukuran akan kehilangan seluruh stok
 * yang sudah diketik.
 */
export function VariantMatrixEditor({ options, combos, onChange }: Props) {
  const total = countCombinations(options);
  const overLimit = total > MAX_VARIANT_COMBINATIONS;

  // Kombinasi kartesius terkini, dengan nilai lama dipertahankan bila cocok.
  const rows = useMemo(() => {
    if (overLimit) return [];
    const lama = new Map(combos.map((c) => [comboKey(c.values), c]));
    return cartesian(options).map((values) => {
      const sebelumnya = lama.get(comboKey(values));
      return sebelumnya
        ? { ...sebelumnya, values }
        : { values, priceModifier: 0, stock: 0 };
    });
  }, [options, combos, overLimit]);

  function pushOptions(nextOptions: OptionState[]) {
    // Kombinasi ikut disinkronkan supaya state induk tidak menyimpan baris
    // yang sudah tidak sah menurut opsi terbaru.
    const lama = new Map(combos.map((c) => [comboKey(c.values), c]));
    const nextCombos = countCombinations(nextOptions) > MAX_VARIANT_COMBINATIONS
      ? combos
      : cartesian(nextOptions).map((values) => {
          const sebelumnya = lama.get(comboKey(values));
          return sebelumnya ? { ...sebelumnya, values } : { values, priceModifier: 0, stock: 0 };
        });
    onChange({ options: nextOptions, combos: nextCombos });
  }

  function updateCombo(key: string, patch: Partial<ComboState>) {
    onChange({
      options,
      combos: rows.map((r) => (comboKey(r.values) === key ? { ...r, ...patch } : r)),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label mb-0">Varian (opsional)</label>
        <button
          type="button"
          onClick={() => pushOptions([...options, { name: '', values: [] }])}
          disabled={options.length >= MAX_VARIANT_OPTIONS}
          className="btn-outline text-sm disabled:opacity-40"
        >
          + Opsi
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Contoh: opsi &ldquo;Warna&rdquo; (Merah, Biru) dan &ldquo;Ukuran&rdquo; (S, M, L).
        Maksimal {MAX_VARIANT_OPTIONS} opsi dan {MAX_VARIANT_COMBINATIONS} kombinasi.
      </p>

      {options.map((opt, oi) => (
        <div key={oi} className="border rounded-lg p-3 space-y-2">
          <div className="flex gap-2 items-center">
            <input
              className="input flex-1 min-w-0"
              placeholder="Nama opsi (mis. Warna)"
              maxLength={30}
              value={opt.name}
              onChange={(e) => {
                const next = [...options];
                next[oi] = { ...opt, name: e.target.value };
                pushOptions(next);
              }}
            />
            <button
              type="button"
              onClick={() => pushOptions(options.filter((_, i) => i !== oi))}
              className="text-red-600 px-2"
              aria-label={`Hapus opsi ${opt.name || oi + 1}`}
            >✕</button>
          </div>
          <input
            className="input w-full"
            placeholder="Nilai, pisahkan dengan koma: Merah, Biru, Hitam"
            value={opt.values.join(', ')}
            onChange={(e) => {
              const values = e.target.value
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean);
              const next = [...options];
              next[oi] = { ...opt, values };
              pushOptions(next);
            }}
          />
        </div>
      ))}

      {overLimit && (
        <p className="text-sm text-red-600">
          Total kombinasi {total} melebihi batas {MAX_VARIANT_COMBINATIONS}. Kurangi nilai opsi dulu.
        </p>
      )}

      {!overLimit && rows.length > 0 && (
        <div className="overflow-x-auto">
          <p className="text-xs text-gray-500 mb-1">{rows.length} kombinasi</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="py-2 pr-2 font-medium">Kombinasi</th>
                <th className="py-2 pr-2 font-medium w-28">±Harga</th>
                <th className="py-2 font-medium w-24">Stok</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const key = comboKey(r.values);
                return (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-1.5 pr-2">{comboLabel(r.values)}</td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        className="input w-full"
                        value={r.priceModifier}
                        onChange={(e) => updateCombo(key, { priceModifier: Number(e.target.value) || 0 })}
                        aria-label={`Selisih harga ${comboLabel(r.values)}`}
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min={0}
                        className="input w-full"
                        value={r.stock}
                        onChange={(e) => updateCombo(key, { stock: Math.max(0, Number(e.target.value) || 0) })}
                        aria-label={`Stok ${comboLabel(r.values)}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
