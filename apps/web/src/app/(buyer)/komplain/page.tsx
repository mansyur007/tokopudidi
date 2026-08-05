'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { canEscalateComplaint, complaintStatusValues, COMPLAINT_STATUS_LABEL } from '@tokopudidi/shared';
import { useAuthStore, useAuthHydrated } from '@/store/auth';
import { listMyComplaints, escalateComplaint, type Complaint } from '@/lib/api/complaints';
import { ComplaintCard } from '@/components/complaint/ComplaintCard';
import { ApiClientError } from '@/lib/api/client';

const TABS = [
  { key: 'ALL', label: 'Semua' },
  ...complaintStatusValues.map((s) => ({ key: s, label: COMPLAINT_STATUS_LABEL[s] })),
];

export default function KomplainPage() {
  const router = useRouter();
  const { user, tokens } = useAuthStore();
  const hydrated = useAuthHydrated();
  const [items, setItems] = useState<Complaint[]>([]);
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Tunggu sesi tersimpan terbaca dulu — tanpa ini pelapor yang membuka
    // /komplain lewat URL langsung dibuang ke /masuk. Lihat `useAuthHydrated`.
    if (!hydrated) return;
    if (!user) router.push('/masuk');
  }, [hydrated, user, router]);

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      const res = await listMyComplaints(tokens.accessToken, { status });
      setItems(res.items);
    } finally { setLoading(false); }
  }, [tokens?.accessToken, status]);

  useEffect(() => { load(); }, [load]);

  async function handleEscalate(id: string) {
    if (!tokens?.accessToken) return;
    setBusy(true); setMsg(null);
    try {
      await escalateComplaint(tokens.accessToken, id);
      setMsg('Komplain dinaikkan ke admin. Keputusan admin bersifat final.');
      await load();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal menaikkan komplain');
    } finally { setBusy(false); }
  }

  // Sebelum layar "Belum ada komplain": sebelum sesi terbaca daftarnya memang kosong.
  if (!hydrated) return <div className="px-4 py-8 text-center text-sm text-gray-500">Memuat...</div>;
  if (!user) return null;

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-8 space-y-3">
      <header>
        <h1 className="text-lg font-semibold">Komplain Saya</h1>
        <p className="text-sm text-gray-500">
          Pengajuan komplain barang rusak, tidak sesuai, atau kurang.
        </p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={
              'shrink-0 px-3 py-1.5 rounded-full text-sm border ' +
              (status === t.key
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-gray-300 text-gray-700')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && <p className="card px-3 py-2 text-sm text-center bg-primary-50 text-primary">{msg}</p>}

      {loading ? (
        <p className="text-center text-sm text-gray-500 py-8">Memuat...</p>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <p className="text-3xl" aria-hidden>📦</p>
          <p className="text-sm text-gray-600">Belum ada komplain.</p>
          <Link href="/pesanan" className="btn-outline inline-block">Lihat Pesanan</Link>
        </div>
      ) : (
        items.map((c) => (
          <ComplaintCard
            key={c.id}
            complaint={c}
            perspective="buyer"
            actions={
              canEscalateComplaint(c) ? (
                <button
                  disabled={busy}
                  onClick={() => handleEscalate(c.id)}
                  className="text-xs px-2 py-1 rounded border border-purple-300 text-purple-700"
                >
                  ⬆️ Naikkan ke Admin
                </button>
              ) : null
            }
          />
        ))
      )}
    </div>
  );
}
