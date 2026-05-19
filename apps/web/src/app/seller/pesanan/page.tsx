'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah, timeAgo } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { listSellerOrders, type SellerOrderRow } from '@/lib/api/seller';
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/orderStatus';
import type { OrderStatus } from '@/lib/api/orders';

const TABS = [
  { key: 'ALL',             label: 'Semua' },
  { key: 'PAID',            label: 'Bayar' },
  { key: 'PROCESSING',      label: 'Diproses' },
  { key: 'SHIPPED',         label: 'Dikirim' },
  { key: 'DELIVERED',       label: 'Sampai' },
  { key: 'COMPLETED',       label: 'Selesai' },
  { key: 'CANCELLED',       label: 'Batal' },
];

export default function SellerOrderListPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<SellerOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');

  useEffect(() => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    listSellerOrders(tokens.accessToken, tab)
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [tokens?.accessToken, tab]);

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-5xl">
      <h1 className="text-xl font-semibold">Pesanan Masuk</h1>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              'shrink-0 px-3 py-1.5 rounded-full text-sm border ' +
              (tab === t.key ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300 text-gray-700')
            }
          >{t.label}</button>
        ))}
      </nav>

      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      {!loading && items.length === 0 && (
        <div className="card p-8 text-center text-gray-600">Belum ada pesanan di tab ini.</div>
      )}

      <div className="space-y-2">
        {items.map((o) => (
          <Link key={o.id} href={`/seller/pesanan/${o.id}`} className="card p-3 block hover:border-primary">
            <div className="flex items-center gap-2 pb-2 border-b">
              <span className="text-sm font-medium flex-1">{o.buyer.fullName}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[o.status as OrderStatus]}`}>
                {STATUS_LABEL[o.status as OrderStatus]}
              </span>
            </div>
            <div className="text-sm mt-2">
              {o.items.slice(0, 2).map((it) => (
                <p key={it.id} className="line-clamp-1">• {it.productName} × {it.quantity}</p>
              ))}
              {o.items.length > 2 && <p className="text-xs text-gray-500">+{o.items.length - 2} lainnya</p>}
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t text-sm">
              <span className="text-xs text-gray-500">{timeAgo(o.createdAt)} · {o.orderNumber}</span>
              <span className="font-semibold text-primary">{formatRupiah(o.total)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
