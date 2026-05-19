'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatRupiah, formatTanggal } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  getSellerOrder,
  processOrder,
  shipOrder,
  rejectOrder,
  markDelivered,
  type SellerOrderDetail,
} from '@/lib/api/seller';
import { ApiClientError } from '@/lib/api/client';
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/orderStatus';
import type { OrderStatus } from '@/lib/api/orders';

export default function SellerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tokens } = useAuthStore();
  const [order, setOrder] = useState<SellerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [trackInput, setTrackInput] = useState('');

  async function load() {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try { setOrder(await getSellerOrder(tokens.accessToken, id)); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tokens?.accessToken, id]);

  async function handleProcess() {
    if (!tokens?.accessToken || !order) return;
    setBusy(true); setMsg(null);
    try { await processOrder(tokens.accessToken, order.id); await load(); }
    catch (err) { setMsg(err instanceof ApiClientError ? err.message : 'Gagal'); }
    finally { setBusy(false); }
  }

  async function handleShip() {
    if (!tokens?.accessToken || !order) return;
    if (trackInput.trim().length < 3) { setMsg('Nomor resi minimal 3 karakter'); return; }
    setBusy(true); setMsg(null);
    try { await shipOrder(tokens.accessToken, order.id, trackInput.trim()); await load(); }
    catch (err) { setMsg(err instanceof ApiClientError ? err.message : 'Gagal'); }
    finally { setBusy(false); }
  }

  async function handleReject() {
    if (!tokens?.accessToken || !order) return;
    const reason = prompt('Alasan tolak pesanan:');
    if (!reason || reason.trim().length < 3) return;
    setBusy(true); setMsg(null);
    try { await rejectOrder(tokens.accessToken, order.id, reason.trim()); await load(); }
    catch (err) { setMsg(err instanceof ApiClientError ? err.message : 'Gagal'); }
    finally { setBusy(false); }
  }

  async function handleMarkDelivered() {
    if (!tokens?.accessToken || !order) return;
    setBusy(true);
    try { await markDelivered(tokens.accessToken, order.id); await load(); }
    catch (err) { setMsg(err instanceof ApiClientError ? err.message : 'Gagal'); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;
  if (!order) return <div className="p-6">Pesanan tidak ditemukan.</div>;

  const addr = order.buyerAddress as null | {
    label: string; recipientName: string; recipientPhone: string;
    fullAddress: string; subdistrict: string; district: string;
    city: string; province: string; postalCode: string;
  };

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-3xl">
      <Link href="/seller/pesanan" className="text-sm text-primary">← Kembali</Link>

      <header className="card p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{order.orderNumber}</p>
          <p className="font-medium">{order.buyer.fullName}</p>
          <p className="text-xs text-gray-500">{formatTanggal(order.createdAt)}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${STATUS_COLOR[order.status as OrderStatus]}`}>
          {STATUS_LABEL[order.status as OrderStatus]}
        </span>
      </header>

      <section className="card p-4">
        <h2 className="font-semibold mb-2">Produk</h2>
        <div className="space-y-2 text-sm">
          {order.items.map((it) => (
            <div key={it.id} className="flex gap-3">
              <div className="relative w-12 h-12 rounded bg-gray-100 overflow-hidden shrink-0">
                {it.productImage && <Image src={it.productImage} alt="" fill sizes="48px" className="object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="line-clamp-2">{it.productName}</p>
                {it.variantName && <p className="text-xs text-gray-500">Varian: {it.variantName}</p>}
                <p className="text-xs text-gray-500">{it.quantity} × {formatRupiah(it.price)}</p>
              </div>
              <p className="font-medium">{formatRupiah(it.subtotal)}</p>
            </div>
          ))}
        </div>
      </section>

      {addr && (
        <section className="card p-4">
          <h2 className="font-semibold mb-1">📍 Alamat Kirim</h2>
          <p className="text-sm">{addr.recipientName} · {addr.recipientPhone}</p>
          <p className="text-sm text-gray-600">
            {addr.fullAddress}, {addr.subdistrict}, {addr.district}, {addr.city}, {addr.province} {addr.postalCode}
          </p>
        </section>
      )}

      {order.notes && (
        <section className="card p-4">
          <h2 className="font-semibold mb-1">📝 Catatan Pembeli</h2>
          <p className="text-sm">{order.notes}</p>
        </section>
      )}

      <section className="card p-4 text-sm space-y-1">
        <h2 className="font-semibold mb-2">Detail Pembayaran</h2>
        <div className="flex justify-between"><span>Metode</span><span>{order.paymentMethod}</span></div>
        <div className="flex justify-between"><span>Kurir</span><span>{order.shippingMethod}</span></div>
        <div className="flex justify-between"><span>Subtotal</span><span>{formatRupiah(order.subtotal)}</span></div>
        <div className="flex justify-between"><span>Ongkir</span><span>{formatRupiah(order.shippingCost)}</span></div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between text-primary"><span>Diskon</span><span>−{formatRupiah(order.discountAmount)}</span></div>
        )}
        <hr className="my-1" />
        <div className="flex justify-between font-semibold">
          <span>Total</span><span className="text-primary">{formatRupiah(order.total)}</span>
        </div>
        {order.trackingNumber && (
          <p className="text-xs text-gray-600 pt-2">No resi: {order.trackingNumber}</p>
        )}
      </section>

      {msg && <p className="card px-3 py-2 text-sm bg-orange-50 text-orange-700">{msg}</p>}

      <section className="card p-4 space-y-2">
        <h2 className="font-semibold">Aksi Pesanan</h2>
        {order.status === 'PAID' && (
          <>
            <button onClick={handleProcess} disabled={busy} className="btn-primary w-full">
              ✓ Proses Pesanan
            </button>
            <button onClick={handleReject} disabled={busy} className="btn-outline w-full text-red-600">
              ✗ Tolak Pesanan
            </button>
          </>
        )}
        {order.status === 'PROCESSING' && (
          <>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Masukkan nomor resi..."
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
              />
              <button onClick={handleShip} disabled={busy} className="btn-primary">Kirim</button>
            </div>
            <button onClick={handleReject} disabled={busy} className="btn-outline w-full text-red-600">
              ✗ Tolak Pesanan
            </button>
          </>
        )}
        {order.status === 'SHIPPED' && (
          <button onClick={handleMarkDelivered} disabled={busy} className="btn-outline w-full">
            Tandai Sudah Sampai (mock kurir)
          </button>
        )}
        <a
          href={`/seller/pesanan/${order.id}/print`}
          target="_blank"
          rel="noopener"
          className="btn-outline w-full text-center"
        >
          🖨️ Print Label Pengiriman
        </a>
      </section>
    </div>
  );
}
