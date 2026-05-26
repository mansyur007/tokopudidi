'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { getAdminDashboard, type AdminDashboard } from '@/lib/api/admin';

export default function AdminDashboardPage() {
  const { tokens } = useAuthStore();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    getAdminDashboard(tokens.accessToken).then(setData).finally(() => setLoading(false));
  }, [tokens?.accessToken]);

  if (loading) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;
  if (!data) return null;

  const maxGmv = Math.max(1, ...data.chart.map((c) => c.gmv));

  return (
    <div className="px-4 md:px-6 py-4 space-y-4 max-w-5xl">
      <header>
        <h1 className="text-xl font-semibold">Dashboard Admin</h1>
        <p className="text-sm text-gray-500">Ringkasan kesehatan platform Tokopudidi.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Total Pengguna" value={String(data.totalUsers)} />
        <Metric label="Penjual" value={String(data.totalSellers)} />
        <Metric label="Toko Aktif" value={String(data.totalShops)} />
        <Metric label="Produk Aktif" value={String(data.activeProducts)} />
        <Metric label="Order Hari Ini" value={String(data.todayOrders)} />
        <Metric label="GMV Hari Ini" value={formatRupiah(data.todayGmv)} highlight />
      </div>

      {/* Antrian yang perlu aksi admin */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ActionCard href="/admin/toko?status=PENDING_KTP" label="Toko menunggu verifikasi KTP" count={data.shopsPendingKtp} emoji="🪪" />
        <ActionCard href="/admin/refund" label="Pengajuan refund pending" count={data.pendingRefunds} emoji="↩️" />
        <ActionCard href="/admin/pengguna" label="Ulasan dilaporkan" count={data.reportedReviews} emoji="🚩" />
      </div>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">GMV 7 Hari Terakhir</h2>
        <div className="flex items-end gap-2 h-32">
          {data.chart.map((c) => {
            const h = Math.round((c.gmv / maxGmv) * 100);
            return (
              <div key={c.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary rounded-t"
                  style={{ height: `${Math.max(2, h)}%` }}
                  title={`${c.date}: ${formatRupiah(c.gmv)} (${c.orderCount} order)`}
                />
                <span className="text-[10px] text-gray-500">{c.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </section>
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

function ActionCard({ href, label, count, emoji }: { href: string; label: string; count: number; emoji: string }) {
  return (
    <Link href={href} className={`card p-4 flex items-center gap-3 hover:bg-gray-50 ${count > 0 ? 'border-orange-300' : ''}`}>
      <span className="text-2xl" aria-hidden>{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-600">{label}</p>
        <p className={`text-lg font-semibold ${count > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{count}</p>
      </div>
      <span className="text-gray-400">→</span>
    </Link>
  );
}
