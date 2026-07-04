'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useWishlistStore } from '@/store/wishlist';
import { trackView } from '@/lib/api/products';
import type { ProductDetail } from '@/lib/api/products';
import { ApiClientError } from '@/lib/api/client';
import { formatRupiah } from '@tokopudidi/shared';
import { Icon } from '@/components/shell/Icon';
import { clsx } from 'clsx';

interface Props { product: ProductDetail }

// BuyBox sticky kanan + handle variant + qty + add.
export function BuyBox({ product }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const add = useCartStore((s) => s.add);
  const wishlisted = useWishlistStore((s) => s.has(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const [variantId, setVariantId] = useState<string | undefined>(product.variants[0]?.id);
  const [qty, setQty] = useState<number>(product.minOrderQty);
  const [busy, setBusy] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Track view sekali per produk per session.
  useEffect(() => {
    const key = `viewed:${product.id}`;
    if (!sessionStorage.getItem(key)) {
      trackView(product.id, token).catch(() => undefined);
      sessionStorage.setItem(key, '1');
    }
  }, [product.id, token]);

  const selectedVariant = product.variants.find((v) => v.id === variantId);
  const stockLeft = selectedVariant?.stock ?? product.stock;
  const effectivePrice = product.price + (selectedVariant?.priceModifier ?? 0);

  function clamp(n: number) {
    if (n < product.minOrderQty) return product.minOrderQty;
    if (n > stockLeft) return stockLeft;
    return n;
  }

  async function handleAdd(navigateAfter: 'cart' | null) {
    if (!user) { router.push('/masuk'); return; }
    setBusy(true);
    setMsg(null);
    try {
      await add(product.id, qty, variantId);
      setMsg('Sudah masuk keranjang!');
      if (navigateAfter === 'cart') router.push('/keranjang');
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal tambah ke keranjang');
    } finally {
      setBusy(false);
    }
  }

  async function handleWishlist() {
    if (!user) { router.push('/masuk'); return; }
    if (wishBusy) return;
    setWishBusy(true);
    try {
      await toggleWishlist(product.id);
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal update wishlist');
    } finally {
      setWishBusy(false);
    }
  }

  const canBuy = product.shop.isOpen && stockLeft > 0;

  return (
    <div className="bg-white border border-line rounded-card p-4 md:sticky md:top-[160px]">
      <div className="font-extrabold text-[15px] mb-3 text-ink">Atur jumlah dan catatan</div>

      {/* Variants (jika ada) */}
      {product.variants.length > 0 && (
        <div className="mb-3">
          <p className="text-[12px] font-semibold text-ink-muted mb-1.5">Varian</p>
          <div className="flex flex-wrap gap-1.5">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock === 0}
                onClick={() => { setVariantId(v.id); setQty(product.minOrderQty); }}
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
      )}

      {/* Qty stepper */}
      <div className="flex items-center gap-3 mb-3.5">
        <div className="inline-flex items-center border-[1.5px] border-line rounded-[9px] overflow-hidden">
          <button
            type="button"
            onClick={() => setQty((q) => clamp(q - 1))}
            disabled={qty <= product.minOrderQty}
            className="w-[34px] h-9 grid place-items-center bg-white text-primary disabled:text-line-dark"
            aria-label="Kurangi jumlah"
          ><Icon name="minus" size={14} /></button>
          <span className="w-[46px] text-center font-bold text-sm border-x-[1.5px] border-line h-9 leading-9">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => clamp(q + 1))}
            disabled={qty >= stockLeft}
            className="w-[34px] h-9 grid place-items-center bg-white text-primary disabled:text-line-dark"
            aria-label="Tambah jumlah"
          ><Icon name="plus" size={14} /></button>
        </div>
        <div className="text-xs text-ink-muted">
          Stok Total <strong className="text-ink font-bold">{stockLeft}</strong>
        </div>
      </div>

      {product.minOrderQty > 1 && (
        <p className="text-[11px] text-ink-muted mb-3 -mt-2">Minimal beli {product.minOrderQty} pcs</p>
      )}

      {/* Subtotal */}
      <div className="flex justify-between items-baseline mb-3.5">
        <span className="text-[13px] text-ink-muted">Subtotal</span>
        <span className="font-extrabold text-[19px] text-ink">{formatRupiah(effectivePrice * qty)}</span>
      </div>

      {/* CTAs */}
      <button
        type="button"
        onClick={() => handleAdd(null)}
        disabled={busy || !canBuy}
        className="w-full bg-primary hover:bg-primary-600 disabled:opacity-50 text-white border-0 py-2.5 rounded-[9px] font-bold text-sm cursor-pointer flex items-center justify-center gap-1.5"
      >
        <Icon name="plus" size={16} /> Keranjang
      </button>
      <button
        type="button"
        onClick={() => handleAdd('cart')}
        disabled={busy || !canBuy}
        className="w-full bg-white text-primary border-[1.5px] border-primary hover:bg-primary-50 disabled:opacity-50 py-2 rounded-[9px] font-bold text-sm cursor-pointer mt-2.5"
      >
        {!product.shop.isOpen ? 'Toko Tutup' : stockLeft === 0 ? 'Habis' : 'Beli Langsung'}
      </button>

      {msg && (
        <p className="mt-2.5 text-[12px] text-center px-2.5 py-1.5 rounded-md bg-primary-50 text-primary-700">{msg}</p>
      )}

      {/* Footer aksi sekunder */}
      <div className="flex justify-around mt-4 pt-3.5 border-t border-line text-ink-muted text-[12.5px]">
        <Link
          href={`/chat?shop=${product.shop.slug}`}
          className="flex items-center gap-1.5 ghost-btn no-underline"
          aria-label="Chat penjual"
        >
          <Icon name="chat" size={16} /> Chat
        </Link>
        <button
          type="button"
          onClick={handleWishlist}
          disabled={wishBusy}
          className={clsx('flex items-center gap-1.5 ghost-btn', wishlisted && 'text-red-500')}
          aria-label={wishlisted ? 'Hapus dari wishlist' : 'Tambah wishlist'}
        >
          <Icon name="heart" size={16} filled={wishlisted} /> {wishlisted ? 'Tersimpan' : 'Wishlist'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== 'undefined' && 'share' in navigator) {
              navigator.share?.({ title: product.name, url: window.location.href }).catch(() => undefined);
            }
          }}
          className="flex items-center gap-1.5 ghost-btn"
          aria-label="Bagikan produk"
        >
          <Icon name="share" size={16} /> Share
        </button>
      </div>
    </div>
  );
}
