'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah, timeAgo } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { getSellerDashboard, type SellerDashboard } from '@/lib/api/seller';
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/orderStatus';
import type { OrderStatus } from '@/lib/api/orders';

export default function SellerDashboardPage() {
  const { tokens } = useAuthStore();
  const [data, setData] = useState<SellerDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    getSellerDashboard(tokens.accessToken)
      .then(setData)
      .finally(() => setLoading(false));
  }, [tokens?.accessToken]);

  if (loading) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;
  if (!data) return null;

  const maxRevenue = Math.max(1, ...data.chart.map((c) => c.revenue));

  return (
    <div className="px-4 md:px-6 py-4 space-y-4 max-w-5xl">
      <header>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-500">Ringkasan toko kamu hari ini</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Pesanan Hari Ini"  value={String(data.todayOrders)} />
        <Metric label="Pendapatan 7 Hari" value={formatRupiah(data.weekRevenue)} />
        <Metric label="Produk Aktif"      value={String(data.activeProducts)} />
        <Metric label="Rating Toko"       value={`⭐ ${data.shop.ratingAvg.toFixed(1)} (${data.shop.ratingCount})`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Metric label="Saldo Aktif" value={formatRupiah(data.shop.balance)} highlight />
        <Metric label="Saldo Tertahan" value={formatRupiah(data.shop.pendingBalance)} />
        <Metric label="Total Terjual" value={String(data.shop.totalSold)} />
      </div>

      {/* Grafik penjualan 7 hari — sederhana SVG bar chart, tanpa lib eksternal. */}
      <section className="card p-4">
        <h2 className="font-semibold mb-3">Penjualan 7 Hari Terakhir</h2>
        <div className="flex items-end gap-2 h-32">
          {data.chart.map((c) => {
            const h = Math.round((c.revenue / maxRevenue) * 100);
            return (
              <div key={c.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary rounded-t"
                  style={{ height: `${Math.max(2, h)}%` }}
                  title={`${c.date}: ${formatRupiah(c.revenue)} (${c.orderCount} order)`}
                />
                <span className="text-[10px] text-gray-500">{c.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Total minggu ini: <span className="font-medium">{formatRupiah(data.weekRevenue)}</span>
        </p>
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Pesanan Perlu Aksi</h2>
          <Link href="/seller/pesanan" className="text-sm text-primary">Semua →</Link>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada pesanan baru. Tetap semangat!</p>
        ) : (
          <ul className="divide-y">
            {data.recentOrders.map((o) => (
              <li key={o.id}>
                <Link href={`/seller/pesanan/${o.id}`} className="flex items-center gap-3 py-2 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{o.buyer.fullName}</p>
                    <p className="text-xs text-gray-500">{o.orderNumber} · {timeAgo(o.createdAt)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[o.status as OrderStatus]}`}>
                    {STATUS_LABEL[o.status as OrderStatus]}
                  </span>
                  <span className="font-semibold text-sm">{formatRupiah(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!data.shop.ktpVerified && (
        <div className="card p-4 bg-orange-50 border-orange-200">
          <p className="text-sm">
            <strong>Toko belum terverifikasi.</strong> Tunggu admin verifikasi KTP-mu (max 2 hari kerja).
            Kamu tetap bisa jualan, tapi pembeli akan lihat badge &quot;Belum Terverifikasi&quot;.
          </p>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`card p-3 ${highlight ? 'bg-primary text-white' : ''}`}>
      <p className={`text-xs ${highlight ? 'text-primary-100' : 'text-gray-500'}`}>{label}</p>
      <p className="font-semibold mt-1 text-lg">{value}</p>
    </div>
  );
}
