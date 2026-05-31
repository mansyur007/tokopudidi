'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatRupiah, timeAgo } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listSellerPayments,
  verifyPayment,
  type PaymentProofRow,
} from '@/lib/api/seller';
import { ApiClientError } from '@/lib/api/client';

const TABS = [
  { key: 'PENDING',  label: 'Menunggu' },
  { key: 'VERIFIED', label: 'Disetujui' },
  { key: 'REJECTED', label: 'Ditolak' },
];

export default function SellerPaymentPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<PaymentProofRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('PENDING');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try { setItems(await listSellerPayments(tokens.accessToken, tab)); }
    finally { setLoading(false); }
  }, [tokens?.accessToken, tab]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handle(approve: boolean, proofId: string) {
    if (!tokens?.accessToken) return;
    let reason: string | undefined;
    if (!approve) {
      const r = prompt('Alasan tolak bukti transfer:');
      if (!r || r.trim().length < 3) return;
      reason = r.trim();
    }
    setBusyId(proofId); setMsg(null);
    try {
      await verifyPayment(tokens.accessToken, proofId, approve, reason);
      await refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-3xl">
      <h1 className="text-xl font-semibold">Verifikasi Pembayaran</h1>
      <p className="text-sm text-gray-500">Bukti transfer manual yang masuk untuk diverifikasi.</p>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              'shrink-0 px-3 py-1.5 rounded-full text-sm border ' +
              (tab === t.key ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300 text-gray-700')
            }
          >{t.label}</button>
        ))}
      </nav>

      {msg && <p className="card px-3 py-2 text-sm bg-orange-50 text-orange-700">{msg}</p>}

      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      {!loading && items.length === 0 && (
        <div className="card p-8 text-center text-gray-600">Tidak ada bukti di kategori ini.</div>
      )}

      <div className="space-y-3">
        {items.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between gap-2 pb-2 border-b">
              <div>
                <p className="font-medium">{p.order.buyer.fullName}</p>
                <p className="text-xs text-gray-500">{p.order.orderNumber} · {timeAgo(p.uploadedAt)}</p>
              </div>
              <p className="font-semibold text-primary">{formatRupiah(p.transferAmount)}</p>
            </div>
            <div className="text-sm mt-2 space-y-1">
              <p>Bank: <span className="font-medium">{p.bankName}</span></p>
              <p>Nama Pengirim: <span className="font-medium">{p.accountName}</span></p>
              <p>Total Pesanan: {formatRupiah(p.order.total)}</p>
              {p.transferAmount !== p.order.total && (
                <p className="text-xs text-orange-700">
                  ⚠️ Nominal transfer ({formatRupiah(p.transferAmount)}) ≠ total pesanan ({formatRupiah(p.order.total)}). Periksa lagi ya.
                </p>
              )}
              {p.rejectReason && (
                <p className="text-xs text-red-600">Alasan tolak: {p.rejectReason}</p>
              )}
            </div>
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.proofImageUrl} alt="Bukti transfer" className="max-h-64 rounded border" />
            </div>
            {!p.verifiedAt && !p.rejectedAt && (
              <div className="flex gap-2 mt-3">
                <button
                  disabled={busyId === p.id}
                  onClick={() => handle(true, p.id)}
                  className="btn-primary flex-1"
                >
                  ✓ Setujui
                </button>
                <button
                  disabled={busyId === p.id}
                  onClick={() => handle(false, p.id)}
                  className="btn-outline flex-1 text-red-600"
                >
                  ✗ Tolak
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
