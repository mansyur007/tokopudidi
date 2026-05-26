'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatRupiah, timeAgo } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listAdminRefunds, resolveRefund,
  type AdminRefundRow,
} from '@/lib/api/admin';
import { ApiClientError } from '@/lib/api/client';

const TABS = [
  { key: 'PENDING', label: 'Menunggu' },
  { key: 'APPROVED', label: 'Disetujui' },
  { key: 'REJECTED', label: 'Ditolak' },
  { key: 'ALL', label: 'Semua' },
];

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  RESOLVED: 'bg-blue-100 text-blue-700',
};

export default function AdminRefundPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<AdminRefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('PENDING');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      const res = await listAdminRefunds(tokens.accessToken, { status: tab });
      setItems(res.items);
    } finally { setLoading(false); }
  }, [tokens?.accessToken, tab]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handle(approved: boolean, r: AdminRefundRow) {
    if (!tokens?.accessToken) return;
    let note: string | undefined;
    if (!approved) {
      const n = prompt('Catatan untuk pembeli (alasan tolak):');
      if (n === null) return;
      note = n.trim();
    } else {
      const n = prompt('Catatan internal (opsional):');
      note = n?.trim() || undefined;
    }
    setBusyId(r.id); setMsg(null);
    try {
      await resolveRefund(tokens.accessToken, r.id, approved, note);
      await refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal memproses');
    } finally { setBusyId(null); }
  }

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-3xl">
      <h1 className="text-xl font-semibold">Pengajuan Refund</h1>
      <p className="text-sm text-gray-500">Tinjau sengketa pembeli. Menyetujui akan mengembalikan stok & memotong saldo penjual.</p>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={'shrink-0 px-3 py-1.5 rounded-full text-sm border ' + (tab === t.key ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300 text-gray-700')}
          >{t.label}</button>
        ))}
      </nav>

      {msg && <p className="card px-3 py-2 text-sm bg-orange-50 text-orange-700">{msg}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {!loading && items.length === 0 && (
        <div className="card p-8 text-center text-gray-600">Tidak ada pengajuan di kategori ini.</div>
      )}

      <div className="space-y-3">
        {items.map((r) => (
          <div key={r.id} className="card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2 pb-2 border-b">
              <div>
                <p className="font-medium">{r.order.orderNumber}</p>
                <p className="text-xs text-gray-500">{r.requestedBy.fullName} · {r.requestedBy.phone} · {timeAgo(r.createdAt)}</p>
                <p className="text-xs text-gray-500">🏪 {r.order.shop.name}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-primary">{formatRupiah(r.order.total)}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_BADGE[r.status]}`}>{r.status}</span>
              </div>
            </div>

            <div className="text-sm">
              <p className="text-xs text-gray-500">Alasan pembeli:</p>
              <p>{r.reason}</p>
            </div>

            <ul className="text-xs text-gray-600 list-disc pl-4">
              {r.order.items.map((it, i) => (
                <li key={i}>{it.productName} × {it.quantity} ({formatRupiah(it.price)})</li>
              ))}
            </ul>

            {r.evidenceImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {r.evidenceImages.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt={`Bukti ${i + 1}`} className="h-24 rounded border shrink-0" />
                ))}
              </div>
            )}

            {r.adminNote && <p className="text-xs text-gray-500">Catatan admin: {r.adminNote}</p>}

            {r.status === 'PENDING' && (
              <div className="flex gap-2 pt-1">
                <button disabled={busyId === r.id} onClick={() => handle(true, r)} className="btn-primary flex-1">✓ Setujui Refund</button>
                <button disabled={busyId === r.id} onClick={() => handle(false, r)} className="btn-outline flex-1 text-red-600">✗ Tolak</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
