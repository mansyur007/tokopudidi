'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { formatRupiah } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  getOrder,
  getPaymentInstruction,
  uploadPaymentProof,
  type OrderDetail,
  type PaymentInstruction,
} from '@/lib/api/orders';
import { ApiClientError } from '@/lib/api/client';

export default function BayarPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, tokens } = useAuthStore();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [instruction, setInstruction] = useState<PaymentInstruction | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state untuk upload bukti.
  const [bankName, setBankName] = useState('BCA');
  const [accountName, setAccountName] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [proofImageUrl, setProofImageUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.push('/masuk');
  }, [user, router]);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    Promise.all([
      getOrder(tokens.accessToken, id),
      getPaymentInstruction(tokens.accessToken, id),
    ])
      .then(([o, inst]) => {
        setOrder(o);
        setInstruction(inst);
        setTransferAmount(o.total);
        if (o.paymentProof) {
          setBankName(o.paymentProof.bankName);
          setAccountName(o.paymentProof.accountName);
          setProofImageUrl(o.paymentProof.proofImageUrl);
        }
      })
      .finally(() => setLoading(false));
  }, [tokens?.accessToken, id]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran file maksimal 2MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format harus JPG/PNG/WebP');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProofImageUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tokens?.accessToken || !order) return;
    if (!proofImageUrl) {
      setError('Upload foto bukti transfer dulu ya');
      return;
    }
    setSubmitting(true);
    setError(null);
    setMsg(null);
    try {
      await uploadPaymentProof(tokens.accessToken, order.id, {
        bankName, accountName, transferAmount, proofImageUrl,
      });
      setMsg('Bukti transfer terkirim. Tunggu konfirmasi seller ya.');
      setTimeout(() => router.push(`/pesanan/${order.id}`), 1500);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal upload');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;
  if (loading) return <div className="px-4 py-8 text-center text-sm text-gray-500">Memuat...</div>;
  if (!order) return <div className="px-4 py-8 text-center">Pesanan tidak ditemukan.</div>;

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-8 space-y-3">
      <header>
        <Link href={`/pesanan/${order.id}`} className="text-sm text-primary">← Kembali ke Pesanan</Link>
        <h1 className="text-lg font-semibold mt-1">Pembayaran Pesanan</h1>
        <p className="text-sm text-gray-500">{order.orderNumber} · Total {formatRupiah(order.total)}</p>
      </header>

      {/* Petunjuk transfer */}
      {instruction?.bankAccounts && order.paymentMethod === 'TRANSFER_MANUAL' && (
        <section className="card p-4">
          <h2 className="font-semibold mb-2">💰 Transfer ke salah satu rekening berikut:</h2>
          <ul className="space-y-2 text-sm">
            {instruction.bankAccounts.map((b) => (
              <li key={b.bank} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{b.bank}</p>
                  <p className="text-xs text-gray-600">{b.accountName}</p>
                </div>
                <span className="font-mono text-sm">{b.accountNo}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 mt-2">
            Transfer pas <span className="font-semibold">{formatRupiah(order.total)}</span> sampai 3 angka terakhir, supaya kami mudah konfirmasi.
          </p>
        </section>
      )}

      {/* Form upload */}
      <form onSubmit={handleSubmit} className="card p-4 space-y-3">
        <h2 className="font-semibold">📸 Upload Bukti Transfer</h2>
        <div>
          <label className="label">Bank</label>
          <select className="input" value={bankName} onChange={(e) => setBankName(e.target.value)}>
            <option>BCA</option>
            <option>BRI</option>
            <option>Mandiri</option>
            <option>BNI</option>
          </select>
        </div>
        <div>
          <label className="label">Nama di Rekening Pengirim</label>
          <input className="input" value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Nominal Ditransfer</label>
          <input
            type="number"
            className="input"
            value={transferAmount}
            onChange={(e) => setTransferAmount(Number(e.target.value))}
            min={1}
            required
          />
        </div>
        <div>
          <label className="label">Foto Bukti Transfer (JPG/PNG, max 2MB)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="text-sm" />
          {proofImageUrl && (
            <div className="mt-2">
              <img src={proofImageUrl} alt="Preview bukti" className="max-h-48 rounded border" />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {msg && <p className="text-sm text-primary">{msg}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Mengirim...' : 'Kirim Bukti Transfer'}
        </button>
      </form>
    </div>
  );
}
