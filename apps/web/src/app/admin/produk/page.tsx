'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listAdminProducts, takedownProduct, restoreProduct,
  type AdminProductRow,
} from '@/lib/api/admin';
import { ApiClientError } from '@/lib/api/client';

const STATUS = [
  { key: 'ALL', label: 'Semua' },
  { key: 'ACTIVE', label: 'Tayang' },
  { key: 'TAKEN_DOWN', label: 'Diturunkan' },
];

export default function AdminProductsPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<AdminProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      const res = await listAdminProducts(tokens.accessToken, { q, status });
      setItems(res.items); setTotal(res.total);
    } finally { setLoading(false); }
  }, [tokens?.accessToken, q, status]);

  useEffect(() => { refresh(); }, [refresh]);

  async function toggle(p: AdminProductRow) {
    if (!tokens?.accessToken) return;
    let reason: string | undefined;
    if (p.isActive) {
      const r = prompt(`Alasan menurunkan "${p.name}":`);
      if (!r || r.trim().length < 3) return;
      reason = r.trim();
    }
    setBusyId(p.id); setMsg(null);
    try {
      if (p.isActive) await takedownProduct(tokens.accessToken, p.id, reason!);
      else await restoreProduct(tokens.accessToken, p.id);
      await refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal');
    } finally { setBusyId(null); }
  }

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-4xl">
      <h1 className="text-xl font-semibold">Produk</h1>
      <p className="text-sm text-gray-500">{total} produk. Turunkan produk yang melanggar aturan.</p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama produk..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          {STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {msg && <p className="card px-3 py-2 text-sm bg-orange-50 text-orange-700">{msg}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {!loading && items.length === 0 && (
        <div className="card p-8 text-center text-gray-600">Tidak ada produk yang cocok.</div>
      )}

      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="card p-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.images[0]?.url || '/placeholder.png'}
              alt={p.name}
              className="w-12 h-12 rounded object-cover bg-gray-100 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/produk/${p.slug}`} className="font-medium truncate hover:text-primary">{p.name}</Link>
                {!p.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">Diturunkan</span>}
              </div>
              <p className="text-xs text-gray-500 truncate">
                🏪 {p.shop.name} · {p.category.name} · {formatRupiah(p.price)} · stok {p.stock}
              </p>
            </div>
            <button
              disabled={busyId === p.id}
              onClick={() => toggle(p)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${p.isActive ? 'text-red-600 border-red-300' : 'text-green-700 border-green-300'}`}
            >
              {p.isActive ? 'Turunkan' : 'Tayangkan'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
