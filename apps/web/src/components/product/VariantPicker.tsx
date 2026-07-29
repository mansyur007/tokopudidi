'use client';

import { clsx } from 'clsx';
import { formatRupiah, availableValues } from '@tokopudidi/shared';
import type { ProductDetail } from '@/lib/api/products';

type Variant = ProductDetail['variants'][number];

interface Props {
  options: ProductDetail['options'];
  variants: Variant[];
  /** Nilai terpilih per option, sejajar urutan `options`. */
  selected: (string | undefined)[];
  onSelect: (optionIndex: number, value: string) => void;
}

/**
 * Pemilih varian multi-axis (M11-A8): satu kelompok chip per opsi.
 *
 * Nilai dinonaktifkan kalau tidak ada satu pun kombinasi aktif & berstok yang
 * memuatnya bersama pilihan yang sedang aktif di opsi lain — jadi pembeli tidak
 * bisa menyusun kombinasi yang tidak dijual.
 */
export function VariantPicker({ options, variants, selected, onSelect }: Props) {
  const varianAktif = variants.map((v) => ({
    values: v.optionValues,
    stock: v.stock,
    priceModifier: v.priceModifier,
  }));

  return (
    <div className="mb-3 space-y-3">
      {options.map((opt, oi) => {
        const tersedia = availableValues(oi, options.map((o) => ({
          name: o.name,
          values: o.values.map((v) => v.value),
        })), varianAktif, selected);

        return (
          <div key={opt.id}>
            <p className="text-[12px] font-semibold text-ink-muted mb-1.5">
              {opt.name}
              {selected[oi] && <span className="ml-1 font-normal text-ink-soft">· {selected[oi]}</span>}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {opt.values.map((val) => {
                const habis = !tersedia.has(val.value);
                const aktif = selected[oi] === val.value;
                return (
                  <button
                    key={val.id}
                    type="button"
                    disabled={habis}
                    aria-pressed={aktif}
                    onClick={() => onSelect(oi, val.value)}
                    className={clsx(
                      'text-xs px-2.5 py-1.5 rounded-md border min-h-[34px]',
                      aktif
                        ? 'border-primary bg-primary-50 text-primary font-semibold'
                        : 'border-line text-ink-soft bg-white',
                      habis && 'opacity-50 line-through cursor-not-allowed',
                    )}
                  >
                    {val.value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Mode 1 sumbu untuk produk yang belum di-backfill ke struktur option/value —
 * daftar chip datar memakai `variant.name`, persis perilaku sebelum M11-A8.
 * Tanpa ini, halaman produk lama akan kehilangan pilihan variannya sama sekali
 * di jeda antara migration dan backfill.
 */
export function LegacyVariantPicker({
  variants, variantId, onSelect,
}: {
  variants: Variant[];
  variantId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-3">
      <p className="text-[12px] font-semibold text-ink-muted mb-1.5">Varian</p>
      <div className="flex flex-wrap gap-1.5">
        {variants.map((v) => (
          <button
            key={v.id}
            type="button"
            disabled={v.stock === 0}
            aria-pressed={variantId === v.id}
            onClick={() => onSelect(v.id)}
            className={clsx(
              'text-xs px-2.5 py-1.5 rounded-md border min-h-[34px]',
              variantId === v.id
                ? 'border-primary bg-primary-50 text-primary font-semibold'
                : 'border-line text-ink-soft bg-white',
              v.stock === 0 && 'opacity-50 line-through',
            )}
          >
            {v.name}
            {v.priceModifier !== 0 && (
              <span className="ml-1 text-[10px] text-ink-muted">
                ({v.priceModifier > 0 ? '+' : ''}{formatRupiah(v.priceModifier)})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
