'use client';

import { useState } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';

interface Props {
  images: { id: string; url: string }[];
  alt: string;
}

export function ProductGallery({ images, alt }: Props) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return <div className="aspect-square bg-gray-100" />;
  }
  return (
    <div className="max-w-md mx-auto bg-white">
      <div className="relative aspect-square bg-gray-100">
        <Image
          src={images[active].url}
          alt={alt}
          fill
          priority
          sizes="(max-width:768px) 100vw, 448px"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              aria-label={`Foto ${i + 1}`}
              className={clsx(
                'relative w-14 h-14 shrink-0 rounded border-2 overflow-hidden',
                i === active ? 'border-primary' : 'border-transparent',
              )}
            >
              <Image src={img.url} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
