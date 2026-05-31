'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah, formatTanggal } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { getSellerFinance, requestWithdraw, type SellerFinance } from '@/lib/api/seller';
import { ApiClientError } from '@/lib/api/client';

export default function SellerFinancePage() {
  const { tokens } = useAuthStore();
  const [data, setData] = useState<SellerFinance | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try { setData(await getSellerFinance(tokens.accessToken)); }
    finally { setLoading(false); }
  }, [tokens?.accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleWithdraw() {
    if (!tokens?.accessToken) return;
    setError(null); setMsg(null);
    if (!amount || amount < 10000) { setError('Minimal tarik dana Rp 10.000'); return; }
    setBusy(true);
    try {
      await requestWithdraw(tokens.accessToken, amount);
      setMsg('Permintaan tarik dana diajukan!');
      setAmount(0);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal');
    } finally { setBusy(false); }
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;
  if (!data) return null;

  const balance = data.shop?.balance ?? 0;
  const pending = data.shop?.pendingBalance ?? 0;

  return (
    <div className="px-4 md:px-6 py-4 space-y-4 max-w-3xl">
      <h1 className="text-xl font-semibold">Keuangan</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 bg-primary text-white">
          <p className="text-xs text-primary-100">Saldo Aktif</p>
          <p className="font-bold text-xl mt-1">{formatRupiah(balance)}</p>
          <p className="text-xs text-primary-100 mt-1">Bisa ditarik</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Saldo Tertahan</p>
          <p className="font-bold text-xl mt-1">{formatRupiah(pending)}</p>
          <p className="text-xs text-gray-500 mt-1">Cair setelah pesanan selesai</p>
        </div>
      </div>

      <section className="card p-4">
        <h2 className="font-semibold mb-2">Tarik Dana</h2>
        {!data.shop?.bankName ? (
          <div>
            <p className="text-sm text-gray-600 mb-2">Atur rekening bank dulu di pengaturan toko.</p>
            <Link href="/seller/pengaturan" className="btn-primary text-sm inline-flex">
              Atur Rekening
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-2">
              Ke: <span className="font-medium">{data.shop.bankName}</span> · {data.shop.bankAccountNo} · a.n. {data.shop.bankAccountName}
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                className="input flex-1"
                value={amount}
                min={10000}
                max={balance}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Nominal"
              />
              <button onClick={handleWithdraw} disabled={busy} className="btn-primary">Tarik</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Max {formatRupiah(balance)}, min Rp 10.000.</p>
            {msg && <p className="text-sm text-primary mt-2">{msg}</p>}
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </>
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-2">Riwayat Penarikan</h2>
        {data.withdrawals.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada penarikan.</p>
        ) : (
          <ul className="divide-y text-sm">
            {data.withdrawals.map((w) => (
              <li key={w.id} className="py-2 flex justify-between">
                <div>
                  <p className="font-medium">{formatRupiah(w.amount)}</p>
                  <p className="text-xs text-gray-500">
                    {formatTanggal(w.requestedAt)} · {w.bankName} {w.bankAccountNo}
                  </p>
                </div>
                <span className={
                  'text-xs px-2 py-0.5 rounded ' +
                  (w.status === 'PROCESSED' ? 'bg-green-100 text-green-700' :
                   w.status === 'REJECTED'  ? 'bg-red-100 text-red-700' :
                                              'bg-orange-100 text-orange-700')
                }>{w.status === 'PROCESSED' ? 'Selesai' : w.status === 'REJECTED' ? 'Ditolak' : 'Diproses'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
