'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { timeAgo } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { listAdminReports, resolveAdminReport, type AdminReportRow } from '@/lib/api/reports';
import { ApiClientError } from '@/lib/api/client';

const STATUS_TABS = [
  { key: 'OPEN', label: 'Terbuka' },
  { key: 'ACTIONED', label: 'Ditindak' },
  { key: 'DISMISSED', label: 'Diabaikan' },
  { key: 'ALL', label: 'Semua' },
];

const TYPE_TABS = [
  { key: 'ALL', label: 'Semua Tipe' },
  { key: 'PRODUCT', label: 'Produk' },
  { key: 'REVIEW', label: 'Ulasan' },
  { key: 'SHOP', label: 'Toko' },
  { key: 'DISCUSSION', label: 'Diskusi' },
  { key: 'USER', label: 'Pengguna' },
];

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-orange-100 text-orange-700',
  REVIEWING: 'bg-blue-100 text-blue-700',
  ACTIONED: 'bg-green-100 text-green-700',
  DISMISSED: 'bg-gray-100 text-gray-600',
};

const TYPE_EMOJI: Record<string, string> = {
  PRODUCT: '📦', REVIEW: '⭐', SHOP: '🏪', DISCUSSION: '💬', USER: '👤',
};

export default function AdminLaporanPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<AdminReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('OPEN');
  const [type, setType] = useState('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      const res = await listAdminReports(tokens.accessToken, status, type, page);
      setItems(res.items);
      setTotal(res.total);
    } finally { setLoading(false); }
  }, [tokens?.accessToken, status, type, page]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handle(action: 'ACTIONED' | 'DISMISSED', r: AdminReportRow) {
    if (!tokens?.accessToken) return;
    const promptText = action === 'ACTIONED'
      ? 'Catatan untuk pelapor (opsional):'
      : 'Alasan diabaikan (opsional, dikirim ke pelapor):';
    const n = prompt(promptText);
    if (n === null) return;
    setBusyId(r.id); setMsg(null);
    try {
      await resolveAdminReport(tokens.accessToken, r.id, action, n.trim() || undefined);
      await refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal memproses');
    } finally { setBusyId(null); }
  }

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-3xl">
      <h1 className="text-xl font-semibold">🚩 Laporan Pengguna</h1>
      <p className="text-sm text-gray-500">
        Arbitrase laporan produk/ulasan/toko/diskusi. Menindak laporan produk akan otomatis menurunkan produk dari etalase.
      </p>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setStatus(t.key); setPage(1); }}
            className={'shrink-0 px-3 py-1.5 rounded-full text-sm border ' + (status === t.key ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300 text-gray-700')}
          >{t.label}</button>
        ))}
      </nav>
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {TYPE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setType(t.key); setPage(1); }}
            className={'shrink-0 px-2.5 py-1 rounded-full text-xs border ' + (type === t.key ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300 text-gray-600')}
          >{t.label}</button>
        ))}
      </nav>

      {msg && <p className="card px-3 py-2 text-sm bg-orange-50 text-orange-700">{msg}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {!loading && items.length === 0 && (
        <div className="card p-8 text-center text-gray-600">Tidak ada laporan di kategori ini. 🎉</div>
      )}

      <div className="space-y-3">
        {items.map((r) => (
          <div key={r.id} className="card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2 pb-2 border-b">
              <div className="min-w-0">
                <p className="font-medium">
                  {TYPE_EMOJI[r.targetType]} {r.target.linkUrl ? (
                    <Link href={r.target.linkUrl} target="_blank" className="hover:underline">{r.target.label}</Link>
                  ) : r.target.label}
                </p>
                <p className="text-xs text-gray-500">
                  Pelapor: {r.reporter.fullName} · {r.reporter.phone} · {timeAgo(r.createdAt)}
                </p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${STATUS_BADGE[r.status]}`}>{r.status}</span>
            </div>

            <div className="text-sm">
              <p className="font-medium">{r.reason}</p>
              {r.description && <p className="text-gray-600 mt-0.5 whitespace-pre-wrap">{r.description}</p>}
            </div>

            {r.evidenceUrls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {r.evidenceUrls.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt={`Bukti ${i + 1}`} className="h-24 rounded border shrink-0" />
                ))}
              </div>
            )}

            {r.adminNote && <p className="text-xs text-gray-500">Catatan admin: {r.adminNote}</p>}

            {(r.status === 'OPEN' || r.status === 'REVIEWING') && (
              <div className="flex gap-2 pt-1">
                <button disabled={busyId === r.id} onClick={() => handle('ACTIONED', r)} className="btn-primary flex-1">
                  ✓ Tindak Lanjuti
                </button>
                <button disabled={busyId === r.id} onClick={() => handle('DISMISSED', r)} className="btn-outline flex-1 text-gray-600">
                  Abaikan
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {total > 20 && (
        <div className="flex items-center justify-center gap-3 pt-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-outline px-3 py-1 disabled:opacity-40">‹ Sebelumnya</button>
          <span>Hal {page} / {Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)} className="btn-outline px-3 py-1 disabled:opacity-40">Berikutnya ›</button>
        </div>
      )}
    </div>
  );
}
