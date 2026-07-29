'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah, formatTanggal } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { getProductStats, type ProductStats } from '@/lib/api/seller';
import { ApiClientError } from '@/lib/api/client';
import { DailyBarChart } from '@/components/seller/DailyBarChart';
import { STATUS_LABEL } from '@/lib/orderStatus';

const RANGES = [
  { key: '7d' as const, label: '7 hari' },
  { key: '30d' as const, label: '30 hari' },
];

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function ProductStatsPage({ params }: { params: { id: string } }) {
  const { tokens } = useAuthStore();
  const token = tokens?.accessToken;

  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      setStats(await getProductStats(token, params.id, range));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal memuat statistik');
    } finally { setLoading(false); }
  }, [token, params.id, range]);

  useEffect(() => { refresh(); }, [refresh]);

  const t = stats?.totals;

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-3xl">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">📈 Statistik Produk</h1>
          {stats && (
            <p className="text-sm text-gray-500 truncate">
              {stats.product.name}
              {!stats.product.isActive && <span className="text-orange-600"> · nonaktif</span>}
            </p>
          )}
        </div>
        <Link href="/seller/produk" className="btn-outline px-3 py-1 text-sm shrink-0">← Produk</Link>
      </div>

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-3 py-1 text-sm rounded-full border ${
              range === r.key
                ? 'bg-primary text-white border-primary font-medium'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {error && <p className="card px-3 py-2 text-sm bg-orange-50 text-orange-700">{error}</p>}

      {stats && t && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Metric label="Penonton unik" value={String(t.viewersInRange)} hint={`dalam ${range === '7d' ? '7' : '30'} hari`} />
            <Metric label="Pesanan" value={String(t.orderCount)} hint={`${t.qtySold} unit terjual`} />
            <Metric label="Pendapatan" value={formatRupiah(t.revenue)} hint="pesanan dibayar" />
            <Metric
              label="Konversi"
              value={t.conversionPct == null ? '—' : `${t.conversionPct}%`}
              hint={t.conversionPct == null ? 'belum ada penonton' : `${t.buyersInRange} pembeli unik`}
            />
          </div>

          <div className="card p-4">
            <h2 className="font-semibold text-sm mb-3">Penonton unik per hari</h2>
            <DailyBarChart data={stats.chart} label="Penonton" />
          </div>

          <div className="card p-3 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">Cara membaca angka ini</p>
            <p>
              <strong>Penonton unik</strong> dihitung dari catatan &ldquo;terakhir dilihat&rdquo; per
              orang — satu orang yang membuka produkmu tiga kali hari ini tetap dihitung satu, dan
              kalau ia membukanya lagi besok, ia berpindah ke hari besok. Jadi grafik ini
              menggambarkan minat harian, bukan jumlah kunjungan.
            </p>
            <p>
              Total kunjungan sepanjang masa: <strong>{stats.product.viewCount}</strong> ·
              total terjual: <strong>{stats.product.soldCount}</strong> · stok sekarang:{' '}
              <strong>{stats.product.stock}</strong>.
            </p>
            <p>
              <strong>Konversi</strong> membandingkan pembeli unik dengan penonton unik pada
              rentang yang sama. Angkanya bisa melebihi 100% kalau pembelinya melihat produk ini
              sebelum rentang ini dimulai.
            </p>
          </div>

          <div className="card p-4">
            <h2 className="font-semibold text-sm mb-3">Pesanan terakhir yang memuat produk ini</h2>
            {stats.recentOrders.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada pesanan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="py-2 pr-2 font-medium">Pesanan</th>
                      <th className="py-2 pr-2 font-medium">Pembeli</th>
                      <th className="py-2 pr-2 font-medium">Status</th>
                      <th className="py-2 pr-2 font-medium text-right">Qty</th>
                      <th className="py-2 font-medium text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.map((o) => (
                      <tr key={o.orderId} className="border-b last:border-0">
                        <td className="py-2 pr-2">
                          <Link href={`/seller/pesanan/${o.orderId}`} className="text-primary hover:underline">
                            {o.orderNumber}
                          </Link>
                          <span className="block text-[11px] text-gray-400">{formatTanggal(o.createdAt)}</span>
                        </td>
                        <td className="py-2 pr-2 truncate max-w-[10rem]">{o.buyerName}</td>
                        <td className="py-2 pr-2 text-xs">{STATUS_LABEL[o.status] ?? o.status}</td>
                        <td className="py-2 pr-2 text-right">{o.quantity}</td>
                        <td className="py-2 text-right">{formatRupiah(o.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
