'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { listOrders, type OrderListItem } from '@/lib/api/orders';
import { formatRupiah, timeAgo } from '@tokopudidi/shared';
import { STATUS_LABEL, STATUS_COLOR, TABS } from '@/lib/orderStatus';

export default function PesananListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, tokens } = useAuthStore();
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const activeTab = searchParams.get('tab') ?? 'ALL';

  useEffect(() => {
    if (!user) router.push('/masuk');
  }, [user, router]);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    listOrders(tokens.accessToken, activeTab)
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [tokens?.accessToken, activeTab]);

  if (!user) return null;

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-8">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold">Pesanan Saya</h1>
        <Link href="/pesanan/ulasan" className="text-sm text-primary hover:underline">
          ⭐ Beri Ulasan
        </Link>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/pesanan?tab=${t.key}`}
            className={
              'shrink-0 px-3 py-1.5 rounded-full text-sm border ' +
              (activeTab === t.key ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300 text-gray-700')
            }
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-3 space-y-3">
        {loading && <p className="text-sm text-gray-500">Memuat...</p>}

        {!loading && items.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-gray-600 mb-3">Belum ada pesanan di tab ini.</p>
            <Link href="/" className="btn-primary inline-flex">Mulai Belanja</Link>
          </div>
        )}

        {items.map((o) => (
          <Link key={o.id} href={`/pesanan/${o.id}`} className="card p-3 block hover:border-primary">
            <div className="flex items-center gap-2 pb-2 border-b">
              <span className="text-sm font-medium flex-1">🏪 {o.shop.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[o.status]}`}>
                {STATUS_LABEL[o.status]}
              </span>
            </div>
            <div className="space-y-1.5 mt-2">
              {o.items.slice(0, 2).map((it) => (
                <div key={it.id} className="flex gap-3 text-sm">
                  <div className="relative w-12 h-12 rounded bg-gray-100 overflow-hidden shrink-0">
                    {it.productImage && (
                      <Image src={it.productImage} alt="" fill sizes="48px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-1">{it.productName}</p>
                    <p className="text-xs text-gray-500">{it.quantity} × {formatRupiah(it.price)}</p>
                  </div>
                </div>
              ))}
              {o.items.length > 2 && (
                <p className="text-xs text-gray-500">+{o.items.length - 2} produk lainnya</p>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t text-sm">
              <span className="text-xs text-gray-500">{timeAgo(o.createdAt)} · {o.orderNumber}</span>
              <span className="font-semibold text-primary">{formatRupiah(o.total)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
