import Link from 'next/link';
import Image from 'next/image';
import { formatRupiah } from '@tokopudidi/shared';
import type { ProductCard as ProductCardType } from '@/lib/api/products';

interface Props {
  product: ProductCardType;
  variant?: 'grid' | 'horizontal';
}

export function ProductCard({ product, variant = 'grid' }: Props) {
  const widthClass = variant === 'horizontal' ? 'w-40 shrink-0' : 'w-full';
  return (
    <Link
      href={`/produk/${product.slug}`}
      className={`${widthClass} card overflow-hidden hover:border-primary transition-colors block`}
    >
      <div className="relative aspect-square bg-gray-100">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover"
          />
        )}
      </div>
      <div className="p-2">
        <p className="text-sm line-clamp-2 leading-tight min-h-[2.5em]">{product.name}</p>
        <p className="font-semibold text-gray-900 mt-1">{formatRupiah(product.price)}</p>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>⭐ {product.ratingAvg.toFixed(1)}</span>
          <span>{product.soldCount} terjual</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">📍 {product.shop.city}</p>
      </div>
    </Link>
  );
}
