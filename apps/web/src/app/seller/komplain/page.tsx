'use client';

import { useCallback, useEffect, useState } from 'react';
import { complaintStatusValues, COMPLAINT_STATUS_LABEL } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { listSellerComplaints, respondComplaint, type Complaint } from '@/lib/api/complaints';
import { ComplaintCard } from '@/components/complaint/ComplaintCard';
import { ApiClientError } from '@/lib/api/client';

const TABS = [
  { key: 'ALL', label: 'Semua' },
  ...complaintStatusValues.map((s) => ({ key: s, label: COMPLAINT_STATUS_LABEL[s] })),
];

export default function SellerKomplainPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<Complaint[]>([]);
  const [status, setStatus] = useState('OPEN');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      const res = await listSellerComplaints(tokens.accessToken, { status });
      setItems(res.items);
    } finally { setLoading(false); }
  }, [tokens?.accessToken, status]);

  useEffect(() => { load(); }, [load]);

  async function handleRespond(c: Complaint, accept: boolean) {
    if (!tokens?.accessToken) return;
    const message = prompt(
      accept
        ? 'Pesan untuk pembeli (komplain akan langsung diselesaikan):'
        : 'Alasan menolak komplain ini:',
    );
    if (!message || message.trim().length < 5) return;
    setBusy(true); setMsg(null);
    try {
      await respondComplaint(tokens.accessToken, c.id, { accept, message: message.trim() });
      setMsg(
        accept
          ? c.resolutionType === 'REFUND'
            ? 'Komplain diterima — dana pesanan dikembalikan ke pembeli.'
            : 'Komplain diterima — silakan kirim barang pengganti.'
          : 'Tanggapan terkirim. Pembeli bisa menaikkan kasus ini ke admin.',
      );
      await load();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal mengirim tanggapan');
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <header>
        <h1 className="text-lg font-semibold">Komplain Pembeli</h1>
        <p className="text-sm text-gray-500">
          Menerima komplain akan langsung menyelesaikannya — kalau pembeli minta dana kembali,
          pesanan direfund saat itu juga.
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
          Tidak ada komplain di filter ini. 🎉
        </div>
      ) : (
        items.map((c) => (
          <ComplaintCard
            key={c.id}
            complaint={c}
            perspective="seller"
            actions={
              c.status === 'OPEN' ? (
                <>
                  <button
                    disabled={busy}
                    onClick={() => handleRespond(c, true)}
                    className="text-xs px-2 py-1 rounded border border-green-300 text-green-700"
                  >
                    ✓ Terima
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => handleRespond(c, false)}
                    className="text-xs px-2 py-1 rounded border border-red-300 text-red-600"
                  >
                    ✕ Tolak
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
