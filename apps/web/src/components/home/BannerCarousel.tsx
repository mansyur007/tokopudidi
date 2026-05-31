'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/shell/Icon';

// Banner palet & copy diambil dari design_handoff_tokopudidi/app/data.jsx (BANNERS).
const BANNERS = [
  {
    kicker: 'Hari Belanja Hemat',
    title: 'Diskon Gadget',
    big: 's.d. 70%',
    bg: '#0f5132',
    accent: '#22c98a',
    note: 'product/lifestyle banner — 1200×340',
  },
  {
    kicker: 'Awal Bulan Untung',
    title: 'Cashback Elektronik',
    big: 's.d. 500rb',
    bg: '#1f3a5f',
    accent: '#5aa9ff',
    note: 'promo banner — 1200×340',
  },
  {
    kicker: 'Gratis Ongkir Spesial',
    title: 'Belanja Rumah Tangga',
    big: 'Untung Banget',
    bg: '#5b2333',
    accent: '#ff7a99',
    note: 'promo banner — 1200×340',
  },
];

export function BannerCarousel() {
  const [idx, setIdx] = useState(0);
  const n = BANNERS.length;

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n]);

  const b = BANNERS[idx];

  return (
    <section className="relative h-[170px] md:h-[200px] rounded-[14px] overflow-hidden">
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{ background: b.bg }}
      />
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `radial-gradient(circle at 78% 50%, ${b.accent}44, transparent 55%)` }}
      />

      {/* Right-side image slot — pola placeholder seperti handoff */}
      <div
        className="absolute right-0 top-0 bottom-0 w-[42%] opacity-50 grid place-items-center text-[11px]"
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 10px)',
          color: 'rgba(255,255,255,0.6)',
        }}
        aria-hidden
      >
        {b.note}
      </div>

      {/* Left content */}
      <div className="absolute left-6 md:left-10 top-0 bottom-0 flex flex-col justify-center text-white max-w-[58%]">
        <div
          className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] md:text-xs font-semibold mb-2 md:mb-3"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{ background: b.accent }}
          />
          {b.kicker}
        </div>
        <div className="text-base md:text-[22px] font-semibold opacity-95 leading-tight">{b.title}</div>
        <div className="text-3xl md:text-[44px] font-extrabold tracking-tight leading-none mt-1">{b.big}</div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="self-start mt-3 md:mt-4 text-white no-underline px-3.5 py-1.5 md:px-4 md:py-2 rounded-lg text-[12.5px] md:text-[13px] font-bold"
          style={{ background: 'rgba(255,255,255,0.16)' }}
        >
          Lihat Promo Lainnya
        </a>
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            className="carousel-arrow left-3"
            onClick={() => setIdx((x) => (x - 1 + n) % n)}
            aria-label="Banner sebelumnya"
          >
            <Icon name="chevron-left" size={18} />
          </button>
          <button
            type="button"
            className="carousel-arrow right-3"
            onClick={() => setIdx((x) => (x + 1) % n)}
            aria-label="Banner berikutnya"
          >
            <Icon name="chevron-right" size={18} />
          </button>
          <div className="absolute bottom-3 left-6 md:left-10 flex gap-1.5">
            {BANNERS.map((_, k) => (
              <button
                key={k}
                type="button"
                onClick={() => setIdx(k)}
                aria-label={`Banner ${k + 1}`}
                className="h-[7px] rounded-[4px] transition-all cursor-pointer border-0"
                style={{
                  width: k === idx ? 18 : 7,
                  background: k === idx ? '#fff' : 'rgba(255,255,255,0.55)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
