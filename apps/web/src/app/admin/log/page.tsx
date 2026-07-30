'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ADMIN_ACTIONS,
  ADMIN_ACTION_LABEL,
  ADMIN_TARGET_TYPES,
  formatTanggalWaktu,
  timeAgo,
  type AdminAction,
} from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listAdminLogs, listAdminLogActors,
  type AdminLogRow,
} from '@/lib/api/admin';
import { ApiClientError } from '@/lib/api/client';

const LIMIT = 30;

// Warna badge per kelompok aksi — sekadar bantuan baca, bukan makna baru.
function warnaAksi(action: string): string {
  if (action.startsWith('DELETE') || action.startsWith('SUSPEND') || action.startsWith('TAKEDOWN')) {
    return 'bg-red-100 text-red-700';
  }
  if (action.startsWith('CREATE')) return 'bg-green-100 text-green-700';
  if (action.startsWith('RESOLVE') || action.startsWith('DECIDE')) return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
}

function labelAksi(action: string): string {
  return ADMIN_ACTION_LABEL[action as AdminAction] ?? action;
}

export default function AdminLogPage() {
  const { tokens } = useAuthStore();
  const token = tokens?.accessToken;

  const [items, setItems] = useState<AdminLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [actors, setActors] = useState<{ id: string; fullName: string; count: number }[]>([]);

  // Filter
  const [adminId, setAdminId] = useState('');
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true); setMsg(null);
    try {
      const res = await listAdminLogs(token, {
        adminId: adminId || undefined,
        action: action || undefined,
        targetType: targetType || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: LIMIT,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal memuat jejak audit');
    } finally { setLoading(false); }
  }, [token, adminId, action, targetType, from, to, page]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!token) return;
    listAdminLogActors(token).then(setActors).catch(() => setActors([]));
  }, [token]);

  // Setiap perubahan filter kembali ke halaman 1 — kalau tidak, filter baru
  // yang hasilnya sedikit akan tampak kosong karena masih di halaman 5.
  function ubahFilter(set: (v: string) => void) {
    return (v: string) => { set(v); setPage(1); };
  }

  function toggleDetail(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const adaFilter = Boolean(adminId || action || targetType || from || to);

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">📜 Jejak Audit Admin</h1>
        <p className="text-sm text-gray-500">
          Semua aksi tulis admin tercatat di sini — siapa, apa, kapan. Hanya bisa dibaca:
          tidak ada cara menghapus atau mengubah entri, termasuk dari panel ini.
        </p>
      </div>

      <div className="card p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm">
        <label className="block">
          <span className="text-xs text-gray-500">Admin</span>
          <select
            value={adminId}
            onChange={(e) => ubahFilter(setAdminId)(e.target.value)}
            className="w-full border rounded-lg px-2 py-1.5 mt-1"
          >
            <option value="">Semua admin</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>{a.fullName} ({a.count})</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">Aksi</span>
          <select
            value={action}
            onChange={(e) => ubahFilter(setAction)(e.target.value)}
            className="w-full border rounded-lg px-2 py-1.5 mt-1"
          >
            <option value="">Semua aksi</option>
            {ADMIN_ACTIONS.map((a) => (
              <option key={a} value={a}>{ADMIN_ACTION_LABEL[a]}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">Jenis sasaran</span>
          <select
            value={targetType}
            onChange={(e) => ubahFilter(setTargetType)(e.target.value)}
            className="w-full border rounded-lg px-2 py-1.5 mt-1"
          >
            <option value="">Semua</option>
            {ADMIN_TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">Dari tanggal</span>
          <input
            type="date" value={from}
            onChange={(e) => ubahFilter(setFrom)(e.target.value)}
            className="w-full border rounded-lg px-2 py-1.5 mt-1"
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">Sampai tanggal</span>
          <input
            type="date" value={to}
            onChange={(e) => ubahFilter(setTo)(e.target.value)}
            className="w-full border rounded-lg px-2 py-1.5 mt-1"
          />
        </label>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{total} entri{adaFilter ? ' (terfilter)' : ''}</span>
        {adaFilter && (
          <button
            onClick={() => {
              setAdminId(''); setAction(''); setTargetType(''); setFrom(''); setTo(''); setPage(1);
            }}
            className="text-primary hover:underline"
          >Reset filter</button>
        )}
      </div>

      {msg && <p className="card px-3 py-2 text-sm bg-orange-50 text-orange-700">{msg}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      {!loading && items.length === 0 && (
        <div className="card p-8 text-center text-gray-600">
          {adaFilter
            ? 'Tidak ada entri yang cocok dengan filter ini.'
            : 'Belum ada aksi admin yang tercatat.'}
        </div>
      )}

      <div className="space-y-2">
        {items.map((row) => {
          const terbuka = expanded.has(row.id);
          return (
            <div key={row.id} className="card p-3 text-sm">
              <div className="flex items-start gap-2 flex-wrap">
                <span className={`text-[11px] px-1.5 py-0.5 rounded shrink-0 ${warnaAksi(row.action)}`}>
                  {labelAksi(row.action)}
                </span>
                <span className="font-medium">{row.admin.fullName}</span>
                {row.note && <span className="text-gray-600 truncate">· {row.note}</span>}
                <span className="text-xs text-gray-400 ml-auto shrink-0" title={formatTanggalWaktu(row.createdAt)}>
                  {timeAgo(row.createdAt)}
                </span>
              </div>

              <div className="text-xs text-gray-500 mt-1 flex gap-2 flex-wrap">
                {row.targetType && (
                  <span>
                    {row.targetType}
                    {row.targetId ? <> · <span className="font-mono">{row.targetId.slice(0, 8)}</span></> : null}
                  </span>
                )}
                <span>{formatTanggalWaktu(row.createdAt)}</span>
                {row.payload != null && (
                  <button onClick={() => toggleDetail(row.id)} className="text-primary hover:underline">
                    {terbuka ? 'Sembunyikan payload' : 'Lihat payload'}
                  </button>
                )}
              </div>

              {terbuka && row.payload != null && (
                <pre className="mt-2 bg-page rounded p-2 text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(row.payload, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-outline px-3 py-1 disabled:opacity-40"
          >‹ Sebelumnya</button>
          <span className="text-gray-500">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-outline px-3 py-1 disabled:opacity-40"
          >Berikutnya ›</button>
        </div>
      )}
    </div>
  );
}
