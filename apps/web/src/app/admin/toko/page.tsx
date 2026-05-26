'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatRupiah, formatTanggal } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listAdminShops, getAdminShop, verifyShopKtp, suspendShop, unsuspendShop,
  type AdminShopRow, type AdminShopDetail,
} from '@/lib/api/admin';
import { ApiClientError } from '@/lib/api/client';

const STATUS = [
  { key: 'ALL', label: 'Semua' },
  { key: 'PENDING_KTP', label: 'Belum Verifikasi' },
  { key: 'VERIFIED', label: 'Terverifikasi' },
  { key: 'SUSPENDED', label: 'Ditangguhkan' },
];

export default function AdminShopsPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<AdminShopRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [detail, setDetail] = useState<AdminShopDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Hormati ?status=PENDING_KTP dari dashboard tanpa useSearchParams (hindari Suspense boundary).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search).get('status');
    if (sp && STATUS.some((s) => s.key === sp)) setStatus(sp);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      const res = await listAdminShops(tokens.accessToken, { q, status });
      setItems(res.items); setTotal(res.total);
    } finally { setLoading(false); }
  }, [tokens?.accessToken, q, status]);

  useEffect(() => { refresh(); }, [refresh]);

  async function openDetail(id: string) {
    if (!tokens?.accessToken) return;
    setMsg(null);
    try { setDetail(await getAdminShop(tokens.accessToken, id)); }
    catch (err) { setMsg(err instanceof ApiClientError ? err.message : 'Gagal memuat detail'); }
  }

  async function doVerify(id: string) {
    if (!tokens?.accessToken) return;
    setBusy(true); setMsg(null);
    try {
      await verifyShopKtp(tokens.accessToken, id);
      setDetail(null); await refresh();
    } catch (err) { setMsg(err instanceof ApiClientError ? err.message : 'Gagal'); }
    finally { setBusy(false); }
  }

  async function doSuspend(s: AdminShopDetail | AdminShopRow) {
    if (!tokens?.accessToken) return;
    setBusy(true); setMsg(null);
    try {
      if (s.deletedAt) {
        await unsuspendShop(tokens.accessToken, s.id);
      } else {
        const r = prompt(`Alasan menangguhkan toko "${s.name}":`);
        if (!r || r.trim().length < 3) { setBusy(false); return; }
        await suspendShop(tokens.accessToken, s.id, r.trim());
      }
      setDetail(null); await refresh();
    } catch (err) { setMsg(err instanceof ApiClientError ? err.message : 'Gagal'); }
    finally { setBusy(false); }
  }

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-4xl">
      <h1 className="text-xl font-semibold">Toko</h1>
      <p className="text-sm text-gray-500">{total} toko.</p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama toko atau kota..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          {STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {msg && <p className="card px-3 py-2 text-sm bg-orange-50 text-orange-700">{msg}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {!loading && items.length === 0 && (
        <div className="card p-8 text-center text-gray-600">Tidak ada toko yang cocok.</div>
      )}

      <div className="space-y-2">
        {items.map((s) => (
          <div key={s.id} className="card p-3 flex items-center gap-3">
            <button onClick={() => openDetail(s.id)} className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{s.name}</p>
                {s.ktpVerified
                  ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">✓ Verified</span>
                  : <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Belum</span>}
                {s.deletedAt && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">Ditangguhkan</span>}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {s.city} · {s._count.products} produk · {s._count.orders} order · {formatRupiah(s.balance)}
              </p>
              <p className="text-[11px] text-gray-400">{s.owner.fullName} · {s.owner.phone}</p>
            </button>
            <div className="flex flex-col gap-1">
              {!s.ktpVerified && !s.deletedAt && (
                <button disabled={busy} onClick={() => doVerify(s.id)} className="text-xs px-2 py-1 rounded border text-green-700 border-green-300">Verifikasi</button>
              )}
              <button disabled={busy} onClick={() => doSuspend(s)} className={`text-xs px-2 py-1 rounded border ${s.deletedAt ? 'text-green-700 border-green-300' : 'text-red-600 border-red-300'}`}>
                {s.deletedAt ? 'Pulihkan' : 'Tangguhkan'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold">{detail.name}</h2>
              <button onClick={() => setDetail(null)} className="p-1" aria-label="Tutup">✕</button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <Info label="Pemilik" value={detail.owner.fullName} />
                <Info label="HP" value={detail.owner.phone} />
                <Info label="Kota" value={detail.city} />
                <Info label="Bergabung" value={formatTanggal(detail.joinedAt)} />
                <Info label="Saldo" value={formatRupiah(detail.balance)} />
                <Info label="Saldo tertahan" value={formatRupiah(detail.pendingBalance)} />
                <Info label="Produk" value={String(detail._count.products)} />
                <Info label="Order" value={String(detail._count.orders)} />
              </div>
              {detail.description && <p className="text-gray-600">{detail.description}</p>}
              <div>
                <p className="text-xs text-gray-500 mb-1">Foto KTP</p>
                {detail.ktpUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={detail.ktpUrl} alt="KTP" className="w-full rounded border" />
                  : <p className="text-gray-400 text-xs">Tidak ada foto KTP.</p>}
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 sticky bottom-0 bg-white">
              {!detail.ktpVerified && !detail.deletedAt && (
                <button disabled={busy} onClick={() => doVerify(detail.id)} className="btn-primary flex-1">✓ Verifikasi KTP</button>
              )}
              <button disabled={busy} onClick={() => doSuspend(detail)} className={`btn-outline flex-1 ${detail.deletedAt ? 'text-green-700' : 'text-red-600'}`}>
                {detail.deletedAt ? 'Pulihkan Toko' : 'Tangguhkan Toko'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
