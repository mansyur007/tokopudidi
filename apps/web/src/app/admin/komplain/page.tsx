'use client';

import { useCallback, useEffect, useState } from 'react';
import { complaintStatusValues, COMPLAINT_STATUS_LABEL } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { listAdminComplaints, decideComplaint, type Complaint } from '@/lib/api/complaints';
import { ComplaintCard } from '@/components/complaint/ComplaintCard';
import { ApiClientError } from '@/lib/api/client';

const TABS = [
  { key: 'ESCALATED', label: 'Perlu Keputusan' },
  { key: 'ALL', label: 'Semua' },
  ...complaintStatusValues
    .filter((s) => s !== 'ESCALATED')
    .map((s) => ({ key: s, label: COMPLAINT_STATUS_LABEL[s] })),
];

export default function AdminKomplainPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('ESCALATED');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      const res = await listAdminComplaints(tokens.accessToken, { status });
      setItems(res.items); setTotal(res.total);
    } finally { setLoading(false); }
  }, [tokens?.accessToken, status]);

  useEffect(() => { load(); }, [load]);

  async function handleDecide(c: Complaint, outcome: 'RESOLVED' | 'REJECTED') {
    if (!tokens?.accessToken) return;
    const note = prompt(
      outcome === 'RESOLVED'
        ? 'Catatan keputusan (memenangkan pembeli):'
        : 'Catatan keputusan (menolak komplain):',
    );
    if (note === null) return;
    setBusy(true); setMsg(null);
    try {
      await decideComplaint(tokens.accessToken, c.id, { outcome, note: note.trim() });
      setMsg('Keputusan tersimpan. Pembeli & penjual sudah diberi tahu.');
      await load();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal menyimpan keputusan');
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <header>
        <h1 className="text-lg font-semibold">Arbitrase Komplain</h1>
        <p className="text-sm text-gray-500">
          {total} komplain di filter ini. Keputusan admin bersifat final — tidak bisa dinaikkan lagi.
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
        <div className="card p-8 text-center text-sm text-gray-600">
          Tidak ada komplain di filter ini.
        </div>
      ) : (
        items.map((c) => (
          <ComplaintCard
            key={c.id}
            complaint={c}
            perspective="admin"
            actions={
              c.status === 'ESCALATED' ? (
                <>
                  <button
                    disabled={busy}
                    onClick={() => handleDecide(c, 'RESOLVED')}
                    className="text-xs px-2 py-1 rounded border border-green-300 text-green-700"
                  >
                    ✓ Menangkan Pembeli
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => handleDecide(c, 'REJECTED')}
                    className="text-xs px-2 py-1 rounded border border-red-300 text-red-600"
                  >
                    ✕ Tolak Komplain
                  </button>
                </>
              ) : null
            }
          />
        ))
      )}
    </div>
  );
}
