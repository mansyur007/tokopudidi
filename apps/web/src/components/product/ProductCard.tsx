'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { formatRupiah } from '@tokopudidi/shared';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useWishlistStore } from '@/store/wishlist';
import { Icon } from '@/components/shell/Icon';
import type { ProductCard as ProductCardType } from '@/lib/api/products';

interface Props {
  product: ProductCardType;
  // Lebar fix saat dipakai di horizontal scroll row; di grid biarkan default (w-full).
  variant?: 'grid' | 'horizontal';
  onAdded?: (productName: string) => void;
}

export function ProductCard({ product, variant = 'grid', onAdded }: Props) {
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  const user = useAuthStore((s) => s.user);
  const wishlisted = useWishlistStore((s) => s.has(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const [wishBusy, setWishBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const widthClass = variant === 'horizontal' ? 'w-40 shrink-0' : 'w-full';

  function openDetail() {
    router.push(`/produk/${product.slug}`);
  }

  async function handleWishlist(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!user) { router.push('/masuk'); return; }
    if (wishBusy) return;
    setWishBusy(true);
    try {
      await toggleWishlist(product.id);
    } catch {
      // diam-diam — jangan interupsi feed
    } finally {
      setWishBusy(false);
    }
  }

  async function quickAdd(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!user) { router.push('/masuk'); return; }
    if (busy) return;
    setBusy(true);
    try {
      await add(product.id, 1);
      onAdded?.(product.name);
    } catch {
      // diam-diam — error sudah ditangani store; tidak perlu interupsi feed
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={`pcard ${widthClass} relative`}
      role="link"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(e) => { if (e.key === 'Enter') openDetail(); }}
    >
      {/* image */}
      <div className="relative aspect-square bg-page overflow-hidden">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width:720px) 50vw, (max-width:1100px) 25vw, 200px"
            className="object-cover"
          />
        )}
        <button
          type="button"
          className="quick-add"
          onClick={quickAdd}
          disabled={busy}
          aria-label={`Tambah ${product.name} ke keranjang`}
        >
          <Icon name="plus" size={16} />
        </button>
        <button
          type="button"
          className="wish-btn"
          data-active={wishlisted}
          onClick={handleWishlist}
          disabled={wishBusy}
          aria-label={wishlisted ? `Hapus ${product.name} dari wishlist` : `Simpan ${product.name} ke wishlist`}
        >
          <Icon name="heart" size={16} filled={wishlisted} />
        </button>
      </div>

      {/* body */}
      <div className="px-2.5 pt-2.5 pb-3 flex flex-col gap-1">
        <h3 className="pcard-name">{product.name}</h3>
        <div className="text-[15.5px] font-extrabold text-ink tracking-tight mt-0.5">
          {formatRupiah(product.price)}
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-ink-muted mt-0.5">
          <span className="inline-flex items-center gap-0.5 text-star">
            <Icon name="star" size={12} />
            <span className="text-ink font-semibold">{product.ratingAvg.toFixed(1)}</span>
          </span>
          <span className="text-line-dark">•</span>
          <span>{product.soldCount} terjual</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-ink-muted truncate">
          <Icon name="pin" size={11} className="text-ink-muted shrink-0" />
          <span className="truncate">{product.shop.city}</span>
        </div>
      </div>
    </article>
  );
}
