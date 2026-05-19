'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { trackView } from '@/lib/api/products';
import type { ProductDetail } from '@/lib/api/products';
import { ApiClientError } from '@/lib/api/client';
import { formatRupiah } from '@tokopudidi/shared';
import { clsx } from 'clsx';

interface Props { product: ProductDetail }

export function AddToCartBar({ product }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const add = useCartStore((s) => s.add);

  const [variantId, setVariantId] = useState<string | undefined>(
    product.variants[0]?.id,
  );
  const [qty, setQty] = useState<number>(product.minOrderQty);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Track view sekali per session per produk.
  useEffect(() => {
    const key = `viewed:${product.id}`;
    if (!sessionStorage.getItem(key)) {
      trackView(product.id).catch(() => undefined);
      sessionStorage.setItem(key, '1');
    }
  }, [product.id]);

  const selectedVariant = product.variants.find((v) => v.id === variantId);
  const stockLeft = selectedVariant?.stock ?? product.stock;
  const effectivePrice = product.price + (selectedVariant?.priceModifier ?? 0);

  function clampQty(n: number): number {
    if (n < product.minOrderQty) return product.minOrderQty;
    if (n > stockLeft) return stockLeft;
    return n;
  }

  async function handleAdd(navigateAfter: 'cart' | null) {
    if (!user) {
      router.push('/masuk');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await add(product.id, qty, variantId);
      setMsg('Sudah masuk keranjang!');
      if (navigateAfter === 'cart') router.push('/keranjang');
    } catch (err) {
      if (err instanceof ApiClientError) setMsg(err.message);
      else setMsg('Gagal tambah ke keranjang');
    } finally {
      setBusy(false);
    }
  }

  const canBuy = product.shop.isOpen && stockLeft > 0;

  return (
    <>
      {/* Variant selector & qty selector — di body, bukan di bottom bar */}
      <div className="px-4 py-4 border-t bg-white space-y-4">
        {product.variants.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Pilih Varian</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { setVariantId(v.id); setQty(product.minOrderQty); }}
                  disabled={v.stock === 0}
                  className={clsx(
                    'px-3 py-1.5 rounded border text-sm min-h-[40px]',
                    variantId === v.id
                      ? 'border-primary bg-primary-50 text-primary font-medium'
                      : 'border-gray-300 bg-white text-gray-700',
                    v.stock === 0 && 'opacity-50 line-through',
                  )}
                >
                  {v.name}
                  {v.priceModifier !== 0 && (
                    <span className="text-xs ml-1">
                      ({v.priceModifier > 0 ? '+' : ''}{formatRupiah(v.priceModifier)})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-sm font-medium mb-2">Jumlah</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQty((q) => clampQty(q - 1))}
              className="w-10 h-10 rounded border border-gray-300 disabled:opacity-50"
              disabled={qty <= product.minOrderQty}
              aria-label="Kurangi"
            >−</button>
            <input
              type="number"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(clampQty(Number(e.target.value) || product.minOrderQty))}
              className="input w-20 text-center"
            />
            <button
              onClick={() => setQty((q) => clampQty(q + 1))}
              className="w-10 h-10 rounded border border-gray-300 disabled:opacity-50"
              disabled={qty >= stockLeft}
              aria-label="Tambah"
            >+</button>
            <span className="text-sm text-gray-500">Stok: {stockLeft}</span>
          </div>
          {product.minOrderQty > 1 && (
            <p className="text-xs text-gray-500 mt-1">
              Minimal beli {product.minOrderQty} pcs
            </p>
          )}
        </div>

        <div className="flex justify-between items-baseline pt-2 border-t">
          <span className="text-sm text-gray-600">Total</span>
          <span className="text-xl font-bold text-primary">
            {formatRupiah(effectivePrice * qty)}
          </span>
        </div>

        {msg && (
          <p className="text-sm text-center px-3 py-2 rounded bg-primary-50 text-primary-700">
            {msg}
          </p>
        )}
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 bg-white border-t z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-2 items-center">
          <Link
            href={`/chat?shop=${product.shop.slug}`}
            className="btn-outline shrink-0 px-3"
            aria-label="Chat penjual"
          >💬</Link>
          <button
            onClick={() => handleAdd(null)}
            disabled={busy || !canBuy}
            className="flex-1 btn-outline border-primary text-primary"
          >
            + Keranjang
          </button>
          <button
            onClick={() => handleAdd('cart')}
            disabled={busy || !canBuy}
            className="flex-1 btn-primary"
          >
            {!product.shop.isOpen ? 'Toko Tutup' : stockLeft === 0 ? 'Habis' : 'Beli Langsung'}
          </button>
        </div>
      </div>
    </>
  );
}
