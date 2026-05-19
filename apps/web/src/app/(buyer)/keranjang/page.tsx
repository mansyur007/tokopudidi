'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';

export default function KeranjangPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data, loading, refresh, update, remove } = useCartStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      router.push('/masuk');
      return;
    }
    refresh();
  }, [user, refresh, router]);

  const grouped = data?.grouped ?? [];

  const selectedItems = useMemo(
    () => (data?.items ?? []).filter((it) => selected.has(it.id)),
    [data, selected],
  );

  const totalPrice = selectedItems.reduce((sum, it) => sum + it.subtotal, 0);

  function toggleAll(checked: boolean) {
    if (!data) return;
    setSelected(checked ? new Set(data.items.map((i) => i.id)) : new Set());
  }

  function toggleShop(shopId: string, checked: boolean) {
    if (!data) return;
    const next = new Set(selected);
    for (const it of data.items) {
      if (it.shop.id === shopId) {
        if (checked) next.add(it.id);
        else next.delete(it.id);
      }
    }
    setSelected(next);
  }

  function toggleItem(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  if (!user) return null;

  return (
    <div className="pb-32 md:pb-8">
      <header className="px-4 py-4 bg-white border-b">
        <h1 className="text-lg font-semibold max-w-5xl mx-auto">Keranjang Belanja</h1>
      </header>

      <div className="px-4 py-4 max-w-5xl mx-auto space-y-3">
        {loading && <p className="text-sm text-gray-500">Memuat keranjang...</p>}

        {!loading && grouped.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-gray-600 mb-3">Keranjangmu masih kosong nih, yuk belanja!</p>
            <Link href="/" className="btn-primary inline-flex">
              Mulai Belanja
            </Link>
          </div>
        )}

        {grouped.map((g) => {
          const allInGroupSelected = g.items.every((it) => selected.has(it.id));
          return (
            <div key={g.shop.id} className="card p-3 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <input
                  type="checkbox"
                  checked={allInGroupSelected}
                  onChange={(e) => toggleShop(g.shop.id, e.target.checked)}
                  aria-label={`Pilih semua dari ${g.shop.name}`}
                  className="w-5 h-5"
                />
                <Link href={`/toko/${g.shop.slug}`} className="font-medium text-sm">
                  🏪 {g.shop.name}
                </Link>
                {!g.shop.isOpen && (
                  <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">Tutup</span>
                )}
              </div>

              {g.items.map((it) => (
                <div key={it.id} className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(it.id)}
                    onChange={(e) => toggleItem(it.id, e.target.checked)}
                    aria-label={`Pilih ${it.product.name}`}
                    className="w-5 h-5 mt-1"
                    disabled={!it.product.isActive || it.product.stock === 0}
                  />
                  <div className="relative w-16 h-16 rounded bg-gray-100 overflow-hidden shrink-0">
                    {it.product.imageUrl && (
                      <Image src={it.product.imageUrl} alt={it.product.name} fill sizes="64px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/produk/${it.product.slug}`} className="text-sm line-clamp-2">
                      {it.product.name}
                    </Link>
                    {it.variant && (
                      <p className="text-xs text-gray-500">Varian: {it.variant.name}</p>
                    )}
                    <p className="text-sm font-semibold mt-1">{formatRupiah(it.price)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => update(it.id, Math.max(1, it.quantity - 1))}
                        className="w-8 h-8 rounded border border-gray-300 disabled:opacity-50"
                        disabled={it.quantity <= 1}
                        aria-label="Kurangi"
                      >−</button>
                      <span className="w-8 text-center text-sm">{it.quantity}</span>
                      <button
                        onClick={() => update(it.id, it.quantity + 1)}
                        className="w-8 h-8 rounded border border-gray-300 disabled:opacity-50"
                        disabled={it.quantity >= it.product.stock}
                        aria-label="Tambah"
                      >+</button>
                      <button
                        onClick={() => remove(it.id)}
                        className="ml-auto text-xs text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                    {it.product.stock < it.quantity && (
                      <p className="text-xs text-red-600 mt-1">
                        Stok hanya {it.product.stock}, kurangi jumlahnya ya.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Sticky bottom checkout bar */}
      {grouped.length > 0 && (
        <div className="fixed bottom-16 md:bottom-0 inset-x-0 bg-white border-t z-20">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm shrink-0">
              <input
                type="checkbox"
                checked={selected.size > 0 && selected.size === (data?.items.length ?? 0)}
                onChange={(e) => toggleAll(e.target.checked)}
                className="w-5 h-5"
              />
              Pilih Semua
            </label>
            <div className="flex-1 text-right">
              <p className="text-xs text-gray-500">Total ({selected.size})</p>
              <p className="font-bold text-primary">{formatRupiah(totalPrice)}</p>
            </div>
            <button
              disabled={selected.size === 0}
              onClick={() => {
                sessionStorage.setItem('checkout-items', JSON.stringify(Array.from(selected)));
                router.push('/checkout');
              }}
              className="btn-primary"
            >
              Beli ({selected.size})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
