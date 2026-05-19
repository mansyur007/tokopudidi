'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Banner } from '@/lib/api/banners';

interface Props { banners: Banner[] }

export function BannerCarousel({ banners }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <section className="bg-primary">
      <div className="relative max-w-5xl mx-auto aspect-[3/1] md:aspect-[4/1] overflow-hidden">
        {banners.map((b, i) => {
          const Wrapper = b.linkUrl ? Link : 'div';
          const wrapperProps = b.linkUrl ? { href: b.linkUrl } : {};
          return (
            <Wrapper
              key={b.id}
              {...(wrapperProps as Record<string, string>)}
              className={`absolute inset-0 transition-opacity duration-500 ${
                i === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <Image src={b.imageUrl} alt="" fill priority={i === 0} className="object-cover" sizes="(max-width:1024px) 100vw, 1024px" />
            </Wrapper>
          );
        })}
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Banner ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
