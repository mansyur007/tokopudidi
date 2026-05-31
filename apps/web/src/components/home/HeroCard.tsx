'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/shell/Icon';

interface Category { id: string; name: string; slug: string }

const TOPUP_TABS = ['Pulsa', 'Paket Data', 'Listrik PLN', 'Roaming'];
const NOMINALS = ['Pilih Nominal', 'Rp10.000', 'Rp25.000', 'Rp50.000', 'Rp100.000'];

export function HeroCard({ categories }: { categories: Category[] }) {
  const [tab, setTab] = useState(0);
  const [phone, setPhone] = useState('0812 3456 7890');

  return (
    <div className="hero-card gap-6 md:gap-0">
      {/* LEFT — Kategori Populer */}
      <div className="md:flex-1 md:basis-[56%] md:pr-7 md:border-r md:border-line">
        <h2 className="text-[19px] font-extrabold m-0 mb-3.5 text-ink">Kategori Populer</h2>

        {/* Gradient CTA banner */}
        <div
          className="relative min-h-[112px] rounded-card overflow-hidden flex items-center px-5 py-4 mb-4 text-white"
          style={{ background: 'linear-gradient(100deg, #1FA463, #18935a)' }}
        >
          <div className="max-w-[62%] relative z-10">
            <div className="text-base font-extrabold leading-tight">Yuk, belanja di Tokopudidi</div>
            <div className="text-xs opacity-90 mt-1">Lengkap dari beragam kategori</div>
            <Link
              href="/kategori"
              className="inline-block mt-3 bg-white text-primary px-4 py-1.5 rounded-full font-bold text-xs no-underline hover:bg-page"
            >
              Cek Sekarang
            </Link>
          </div>
          {/* dekorasi gradien aksen di kanan */}
          <div
            className="absolute right-0 top-0 bottom-0 w-[40%] opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 10px)',
            }}
            aria-hidden
          />
        </div>

        {/* Chips kategori real */}
        <div className="flex flex-wrap gap-2">
          {categories.slice(0, 10).map((c) => (
            <Link key={c.id} href={`/kategori/${c.slug}`} className="cat-chip no-underline">
              <span className="cat-chip-icon">
                <span className="block w-1.5 h-1.5 rounded-full bg-primary" aria-hidden />
              </span>
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {/* RIGHT — Top Up & Tagihan */}
      <div className="md:flex-1 md:basis-[44%] md:pl-7">
        <div className="flex items-center gap-2 mb-3.5">
          <h2 className="text-[19px] font-extrabold m-0 text-ink">Top Up &amp; Tagihan</h2>
          <a href="#" onClick={(e) => e.preventDefault()} className="text-primary font-bold text-[13px] no-underline ml-auto">
            Lihat Semua
          </a>
        </div>

        <div className="flex gap-[18px] border-b border-line mb-4 overflow-x-auto">
          {TOPUP_TABS.map((t, k) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(k)}
              data-active={k === tab}
              className="topup-tab shrink-0"
            >
              {t}
            </button>
          ))}
        </div>

        <label className="block text-[12.5px] font-semibold text-ink-muted">Nomor Telepon</label>
        <div className="flex gap-2.5 mt-1.5">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="topup-input"
            aria-label="Nomor telepon"
          />
          <div className="relative flex-1">
            <select className="topup-input appearance-none w-full text-ink-muted pr-9" aria-label="Pilih nominal">
              {NOMINALS.map((n) => <option key={n}>{n}</option>)}
            </select>
            <Icon name="chevron-down" size={16} className="absolute right-3 top-[13px] text-ink-muted pointer-events-none" />
          </div>
        </div>

        <button
          type="button"
          className="mt-4 w-full bg-primary hover:bg-primary-600 text-white border-0 py-2.5 rounded-[9px] font-bold text-sm cursor-pointer transition-colors"
        >
          Beli
        </button>
      </div>
    </div>
  );
}
