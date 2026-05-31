'use client';

import { useState } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';

interface Props {
  images: { id: string; url: string }[];
  alt: string;
}

// Gallery untuk halaman detail produk:
// - kolom thumbnail vertikal (≤ 5 × 50px), border hijau saat aktif
// - main image aspect 1:1 dengan border line, radius 12px
// Ganti gambar utama saat hover/klik thumbnail.
export function ProductGallery({ images, alt }: Props) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return <div className="aspect-square bg-page rounded-card border border-line" />;
  }
  const thumbs = images.slice(0, 5);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col gap-2 shrink-0">
        {thumbs.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={`Foto ${i + 1}`}
            className={clsx(
              'relative w-[50px] h-[50px] rounded-md overflow-hidden p-0 cursor-pointer bg-page',
              i === active ? 'border-2 border-primary' : 'border border-line',
            )}
          >
            <Image src={img.url} alt="" fill sizes="50px" className="object-cover" />
          </button>
        ))}
      </div>
      <div className="flex-1 relative aspect-square rounded-card overflow-hidden border border-line bg-page">
        <Image
          src={images[active].url}
          alt={alt}
          fill
          priority
          sizes="(max-width:1080px) 90vw, 340px"
          className="object-cover"
        />
      </div>
    </div>
  );
}
