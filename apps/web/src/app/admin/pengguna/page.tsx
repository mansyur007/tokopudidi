'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatTanggal } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listAdminUsers, suspendUser, unsuspendUser,
  type AdminUserRow,
} from '@/lib/api/admin';
import { ApiClientError } from '@/lib/api/client';

const ROLE_TABS = [
  { key: 'ALL', label: 'Semua' },
  { key: 'BUYER', label: 'Pembeli' },
  { key: 'SELLER', label: 'Penjual' },
  { key: 'ADMIN', label: 'Admin' },
];

const ROLE_BADGE: Record<string, string> = {
  BUYER: 'bg-gray-100 text-gray-700',
  SELLER: 'bg-blue-100 text-blue-700',
  ADMIN: 'bg-purple-100 text-purple-700',
};

export default function AdminUsersPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      const res = await listAdminUsers(tokens.accessToken, { q, role });
      setItems(res.items); setTotal(res.total);
    } finally { setLoading(false); }
  }, [tokens?.accessToken, q, role]);

  useEffect(() => { refresh(); }, [refresh]);

  async function toggleSuspend(u: AdminUserRow) {
    if (!tokens?.accessToken) return;
    let reason: string | undefined;
    if (!u.isSuspended) {
      const r = prompt(`Alasan menonaktifkan ${u.fullName}:`);
      if (!r || r.trim().length < 3) return;
      reason = r.trim();
    }
    setBusyId(u.id); setMsg(null);
    try {
      if (u.isSuspended) await unsuspendUser(tokens.accessToken, u.id);
      else await suspendUser(tokens.accessToken, u.id, reason!);
      await refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal memproses');
    } finally { setBusyId(null); }
  }

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-4xl">
      <h1 className="text-xl font-semibold">Pengguna</h1>
      <p className="text-sm text-gray-500">{total} pengguna terdaftar.</p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama, HP, atau email..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          {ROLE_TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      {msg && <p className="card px-3 py-2 text-sm bg-orange-50 text-orange-700">{msg}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {!loading && items.length === 0 && (
        <div className="card p-8 text-center text-gray-600">Tidak ada pengguna yang cocok.</div>
      )}

      <div className="space-y-2">
        {items.map((u) => (
          <div key={u.id} className="card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{u.fullName}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${ROLE_BADGE[u.role]}`}>{u.role}</span>
                {u.isSuspended && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">Nonaktif</span>}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {u.phone}{u.email ? ` · ${u.email}` : ''}{u.shop ? ` · 🏪 ${u.shop.name}` : ''}
              </p>
              <p className="text-[11px] text-gray-400">Gabung {formatTanggal(u.createdAt)}</p>
            </div>
            {u.role !== 'ADMIN' && (
              <button
                disabled={busyId === u.id}
                onClick={() => toggleSuspend(u)}
                className={`text-sm px-3 py-1.5 rounded-lg border ${u.isSuspended ? 'text-green-700 border-green-300' : 'text-red-600 border-red-300'}`}
              >
                {u.isSuspended ? 'Aktifkan' : 'Nonaktifkan'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
