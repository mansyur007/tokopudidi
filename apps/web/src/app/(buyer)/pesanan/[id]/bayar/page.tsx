'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { formatRupiah } from '@tokopudidi/shared';
import { useAuthStore, useAuthHydrated } from '@/store/auth';
import {
  getOrder,
  getPaymentInstruction,
  getQrisPayment,
  simulateQrisPaid,
  uploadPaymentProof,
  type OrderDetail,
  type PaymentInstruction,
  type QrisPayment,
} from '@/lib/api/orders';
import { QrisPanel } from '@/components/order/QrisPanel';
import { ApiClientError } from '@/lib/api/client';
import { SmartImage } from '@/components/media/SmartImage';

export default function BayarPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, tokens } = useAuthStore();
  const hydrated = useAuthHydrated();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [instruction, setInstruction] = useState<PaymentInstruction | null>(null);
  const [qris, setQris] = useState<QrisPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  // Form state untuk upload bukti.
  const [bankName, setBankName] = useState('BCA');
  const [accountName, setAccountName] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [proofImageUrl, setProofImageUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Tunggu sesi tersimpan terbaca dulu. Halaman ini paling sering dibuka lewat
    // URL langsung — tautan "bayar sekarang" dari notifikasi atau riwayat chat —
    // dan tanpa ini pembeli yang mau membayar malah mendarat di /masuk.
    // Lihat `useAuthHydrated`.
    if (!hydrated) return;
    if (!user) router.push('/masuk');
  }, [hydrated, user, router]);

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      const o = await getOrder(tokens.accessToken, id);
      setOrder(o);
      setTransferAmount(o.total);
      if (o.paymentProof) {
        setBankName(o.paymentProof.bankName);
        setAccountName(o.paymentProof.accountName);
        setProofImageUrl(o.paymentProof.proofImageUrl);
      }
      // Ambil hanya yang relevan dengan metode bayarnya.
      if (o.paymentMethod === 'QRIS_MOCK') {
        setQris(await getQrisPayment(tokens.accessToken, id));
      } else if (o.paymentMethod === 'TRANSFER_MANUAL') {
        setInstruction(await getPaymentInstruction(tokens.accessToken, id));
      }
    } finally {
      setLoading(false);
    }
  }, [tokens?.accessToken, id]);

  useEffect(() => { load(); }, [load]);

  async function handleSimulatePaid() {
    if (!tokens?.accessToken || !order) return;
    setPaying(true);
    setError(null);
    try {
      await simulateQrisPaid(tokens.accessToken, order.id);
      router.push(`/pesanan/${order.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal memproses pembayaran');
      await load();
    } finally {
      setPaying(false);
    }
  }

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

  // Dijaga SEBELUM "Pesanan tidak ditemukan": sebelum sesi terbaca belum ada
  // token untuk mengambil pesanannya, jadi klaim "tidak ditemukan" itu salah.
  if (!hydrated) return <div className="px-4 py-8 text-center text-sm text-gray-500">Memuat...</div>;
  if (!user) return null;
  if (loading) return <div className="px-4 py-8 text-center text-sm text-gray-500">Memuat...</div>;
  if (!order) return <div className="px-4 py-8 text-center">Pesanan tidak ditemukan.</div>;

  const menungguPembayaran = order.status === 'PENDING_PAYMENT';

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-8 space-y-3">
      <header>
        <Link href={`/pesanan/${order.id}`} className="text-sm text-primary">← Kembali ke Pesanan</Link>
        <h1 className="text-lg font-semibold mt-1">Pembayaran Pesanan</h1>
        <p className="text-sm text-gray-500">{order.orderNumber} · Total {formatRupiah(order.total)}</p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Order sudah lewat tahap bayar — jangan tampilkan QR atau form yang menyesatkan. */}
      {!menungguPembayaran && (
        <section className="card p-6 text-center space-y-2">
          <p className="text-3xl">{order.status === 'EXPIRED' ? '⌛' : '✅'}</p>
          <h2 className="font-semibold">
            {order.status === 'EXPIRED'
              ? 'Batas waktu pembayaran habis'
              : 'Pesanan ini sudah tidak menunggu pembayaran'}
          </h2>
          <p className="text-sm text-gray-600">
            {order.status === 'EXPIRED'
              ? 'Stok sudah dikembalikan. Kamu bisa pesan ulang kapan saja.'
              : 'Cek detail pesanan untuk melihat status terbarunya.'}
          </p>
          <div className="flex gap-2 justify-center pt-1">
            <Link href={`/pesanan/${order.id}`} className="btn-primary">Lihat Pesanan</Link>
            <Link href="/" className="btn-outline">Belanja Lagi</Link>
          </div>
        </section>
      )}

      {/* QRIS mock — QR + hitung mundur 15 menit. */}
      {menungguPembayaran && order.paymentMethod === 'QRIS_MOCK' && qris && (
        <QrisPanel qris={qris} paying={paying} onPay={handleSimulatePaid} onExpired={load} />
      )}

      {/* COD tidak butuh halaman bayar, tapi bisa saja dibuka lewat URL langsung. */}
      {menungguPembayaran && order.paymentMethod === 'COD' && (
        <section className="card p-6 text-center space-y-1">
          <p className="text-3xl">📦</p>
          <h2 className="font-semibold">Pesanan COD</h2>
          <p className="text-sm text-gray-600">Bayar tunai ke kurir saat barang sampai — tidak ada yang perlu dibayar sekarang.</p>
        </section>
      )}

      {menungguPembayaran && order.paymentMethod === 'TRANSFER_MANUAL' && (
        <>
          {/* Petunjuk transfer */}
          {instruction?.bankAccounts && (
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
                  <SmartImage src={proofImageUrl} alt="Preview bukti" className="max-h-48 rounded border" />
                </div>
              )}
            </div>

            {msg && <p className="text-sm text-primary">{msg}</p>}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Mengirim...' : 'Kirim Bukti Transfer'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
