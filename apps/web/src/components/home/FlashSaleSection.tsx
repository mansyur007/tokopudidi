'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { formatSisaWaktu } from '@tokopudidi/shared';
import { ProductCard } from '@/components/product/ProductCard';
import type { FlashSaleItemCard, RunningFlashSale } from '@/lib/api/flashSale';

/**
 * Hitungan mundur ke `endAt`. Pola & alasannya sama dengan `QrisPanel` (M10-A5):
 * selisih dihitung ulang dari jam sistem tiap detik, bukan dikurangi 1000 —
 * tab yang di-suspend browser tidak lantas menahan waktu.
 */
function useCountdown(endAt: string): number {
  const [msLeft, setMsLeft] = useState(() => Math.max(0, new Date(endAt).getTime() - Date.now()));
  useEffect(() => {
    const tick = () => setMsLeft(Math.max(0, new Date(endAt).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endAt]);
  return msLeft;
}

export function FlashSaleCountdown({ endAt, onEnded }: { endAt: string; onEnded?: () => void }) {
  const msLeft = useCountdown(endAt);

  // Sekali saja — tanpa guard, tiap tick setelah 00:00:00 memicu ulang.
  const sudah = useRef(false);
  useEffect(() => {
    if (msLeft === 0 && !sudah.current) {
      sudah.current = true;
      onEnded?.();
    }
  }, [msLeft, onEnded]);

  return (
    <span
      className="font-mono font-bold text-[13px] bg-ink text-white rounded px-1.5 py-0.5"
      // Hitungan mundur berubah tiap detik; tanpa ini pembaca layar
      // membacakannya terus-menerus dan menutupi isi halaman.
      aria-live="off"
      aria-label={`Berakhir dalam ${formatSisaWaktu(msLeft)}`}
    >
      {formatSisaWaktu(msLeft)}
    </span>
  );
}

/** Bar sisa kuota + label "Habis" saat slotnya benar-benar tandas. */
export function QuotaBar({ item }: { item: FlashSaleItemCard }) {
  const terjual = Math.min(item.soldCount, item.quota);
  const persen = item.quota > 0 ? Math.round((terjual / item.quota) * 100) : 100;
  const habis = item.remaining <= 0;

  return (
    <div className="px-2.5 pb-2.5 -mt-1">
      <div
        className="h-3 rounded-full bg-red-100 overflow-hidden relative"
        role="progressbar"
        aria-valuenow={persen}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={habis ? 'Kuota habis' : `Terjual ${terjual} dari ${item.quota}`}
      >
        <div
          className={habis ? 'h-full bg-ink-muted' : 'h-full bg-red-500'}
          style={{ width: `${persen}%` }}
        />
      </div>
      <p className="text-[10.5px] mt-0.5 font-semibold text-ink-muted">
        {habis ? 'Kuota habis — harga kembali normal' : `${item.remaining} lagi dengan harga ini`}
      </p>
    </div>
  );
}

interface Props {
  event: RunningFlashSale;
  /** Beranda memotong daftarnya; halaman `/flash-sale` menampilkan semuanya. */
  limit?: number;
  showAllLink?: boolean;
  /** `row` = geser horizontal (beranda), `grid` = daftar penuh (/flash-sale). */
  layout?: 'row' | 'grid';
}

export function FlashSaleSection({ event, limit, showAllLink = false, layout = 'row' }: Props) {
  // Event bisa berakhir saat halaman sedang dibuka. Section-nya harus hilang
  // sendiri — tanpa ini, kartu berharga flash tetap terpampang padahal checkout
  // sudah menagih harga normal.
  const [berakhir, setBerakhir] = useState(false);
  if (berakhir || event.items.length === 0) return null;

  const items = limit ? event.items.slice(0, limit) : event.items;

  return (
    <section className="mt-7" data-testid="flash-sale-section">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-[15px] font-extrabold text-ink truncate">⚡ {event.name}</h2>
          <FlashSaleCountdown endAt={event.endAt} onEnded={() => setBerakhir(true)} />
        </div>
        {showAllLink && (
          <Link href="/flash-sale" className="text-[12.5px] font-semibold text-primary no-underline shrink-0">
            Lihat Semua
          </Link>
        )}
      </div>

      <div
        className={
          layout === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3'
            : 'flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory'
        }
      >
        {items.map((it) => (
          <div key={it.id} className={layout === 'grid' ? '' : 'snap-start w-40 shrink-0'}>
            <ProductCard product={it.product} variant={layout === 'grid' ? 'grid' : 'horizontal'} />
            <QuotaBar item={it} />
          </div>
        ))}
      </div>
    </section>
  );
}
