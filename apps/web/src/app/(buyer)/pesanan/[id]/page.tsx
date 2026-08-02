'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { SmartImage } from '@/components/media/SmartImage';
import {
  formatRupiah,
  formatTanggal,
  formatTanggalWaktu,
  isComplaintWindowOpen,
  canViewInvoice,
  preorderEstimate,
} from '@tokopudidi/shared';
import { useAuthStore, useAuthHydrated } from '@/store/auth';
import {
  getOrder,
  cancelOrder,
  completeOrder,
  requestRefund,
  type OrderDetail,
} from '@/lib/api/orders';
import { ApiClientError } from '@/lib/api/client';
import { ComplaintModal } from '@/components/complaint/ComplaintModal';
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/orderStatus';
import { getCourierTrackUrl } from '@/lib/couriers';

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, tokens } = useAuthStore();
  const hydrated = useAuthHydrated();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);

  useEffect(() => {
    // Tunggu sesi tersimpan terbaca dulu — tanpa ini pemilik pesanan yang
    // membuka /pesanan/[id] lewat URL langsung (mis. dari tautan invoice)
    // selalu dibuang ke /masuk. Lihat `useAuthHydrated`.
    if (!hydrated) return;
    if (!user) { router.replace('/masuk'); return; }
  }, [hydrated, user, router]);

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      setOrder(await getOrder(tokens.accessToken, id));
    } finally {
      setLoading(false);
    }
  }, [tokens?.accessToken, id]);

  useEffect(() => { load(); }, [load]);

  async function handleCancel() {
    if (!tokens?.accessToken || !order) return;
    const reason = prompt('Alasan pembatalan:');
    if (!reason || reason.trim().length < 3) return;
    setBusy(true); setMsg(null);
    try {
      await cancelOrder(tokens.accessToken, order.id, reason.trim());
      await load();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal batalkan');
    } finally { setBusy(false); }
  }

  async function handleComplete() {
    if (!tokens?.accessToken || !order) return;
    setBusy(true); setMsg(null);
    try {
      await completeOrder(tokens.accessToken, order.id);
      setMsg('Pesanan diselesaikan, terima kasih!');
      await load();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal selesaikan');
    } finally { setBusy(false); }
  }

  async function handleRefund() {
    if (!tokens?.accessToken || !order) return;
    const reason = prompt('Ceritakan masalahnya (minimal 10 karakter):');
    if (!reason || reason.trim().length < 10) return;
    setBusy(true); setMsg(null);
    try {
      await requestRefund(tokens.accessToken, order.id, reason.trim());
      setMsg('Pengajuan refund terkirim. Admin akan meninjau dalam 1-2 hari kerja.');
      await load();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal mengajukan refund');
    } finally { setBusy(false); }
  }

  async function handleCopyResi() {
    if (!order?.trackingNumber) return;
    try {
      await navigator.clipboard.writeText(order.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia (http non-secure) — abaikan
    }
  }

  if (!hydrated) return <div className="px-4 py-8 text-center text-sm text-gray-500">Memuat pesanan...</div>;
  if (!user) return null;
  if (loading) return <div className="px-4 py-8 text-center text-sm text-gray-500">Memuat pesanan...</div>;
  if (!order) return <div className="px-4 py-8 text-center">Pesanan tidak ditemukan.</div>;

  // Jendela komplain: 2 hari sejak barang diterima (M10-A7).
  const bisaKomplain =
    ['DELIVERED', 'COMPLETED'].includes(order.status) && isComplaintWindowOpen(order.deliveredAt);

  // Estimasi pre-order (M15-B1) — aturannya (lead time TERLAMA, dihitung dari
  // `paidAt`, snapshot per item) ada di shared supaya bisa diuji tanpa merender
  // halaman ini. Lihat `preorderEstimate`.
  const estimasiDiproses = preorderEstimate(order.items, order.paidAt);

  const addr = order.buyerAddress as null | {
    label: string; recipientName: string; recipientPhone: string;
    fullAddress: string; subdistrict: string; district: string;
    city: string; province: string; postalCode: string;
  };

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-8 space-y-3">
      <header className="card p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500">{order.orderNumber}</p>
            <p className="text-sm">{formatTanggal(order.createdAt)}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${STATUS_COLOR[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </header>

      {/* Timeline status pesanan */}
      <section className="card p-4">
        <h2 className="font-semibold mb-2">Status Pesanan</h2>
        <ol className="text-sm space-y-1">
          {[
            { label: 'Pesanan dibuat',  at: order.createdAt },
            { label: 'Dibayar',         at: order.paidAt },
            // processedAt baru ada sejak M8-A6 — fallback ke paidAt untuk order lama.
            { label: 'Diproses seller', at: order.processedAt ?? (order.status === 'PROCESSING' || order.shippedAt ? order.paidAt : null) },
            { label: 'Dikirim',         at: order.shippedAt },
            { label: 'Sampai tujuan',   at: order.deliveredAt },
            { label: 'Selesai',         at: order.completedAt },
          ].map((s, i) => (
            <li key={i} className={`flex gap-2 ${s.at ? 'text-gray-900' : 'text-gray-400'}`}>
              <span aria-hidden>{s.at ? '●' : '○'}</span>
              <span className="flex-1">{s.label}</span>
              {s.at && <span className="text-xs text-gray-500">{formatTanggalWaktu(s.at)}</span>}
            </li>
          ))}
          {(order.status === 'CANCELLED' || order.status === 'EXPIRED') && (
            <li className="flex gap-2 text-red-700">
              <span aria-hidden>●</span>
              <span className="flex-1">
                {order.status === 'EXPIRED' ? 'Kedaluwarsa' : 'Dibatalkan'}
                {order.cancelReason ? ` — ${order.cancelReason}` : ''}
              </span>
            </li>
          )}
        </ol>
        {order.status === 'PROCESSING' && estimasiDiproses && (
          <p className="text-xs text-primary-700 bg-primary-50 rounded px-2.5 py-1.5 mt-2">
            📦 Ada produk pre-order — estimasi diproses s.d. {formatTanggal(estimasiDiproses)}
          </p>
        )}
      </section>

      {/* Tracking dummy */}
      {order.tracking && (
        <section className="card p-4">
          <h2 className="font-semibold mb-2">Pelacakan Pengiriman</h2>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <p className="text-xs text-gray-500">
              {order.courierName ? `${order.courierName} · ` : ''}No resi: {order.trackingNumber}
            </p>
            <button
              onClick={handleCopyResi}
              className="text-xs px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-50"
            >
              {copied ? '✓ Tersalin' : '📋 Salin resi'}
            </button>
            {(() => {
              const url = getCourierTrackUrl(order.courierName, order.trackingNumber);
              return url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                  Lacak di situs kurir ↗
                </a>
              ) : null;
            })()}
          </div>
          <ol className="text-sm space-y-1">
            {order.tracking.map((t, i) => (
              <li key={i} className={`flex gap-2 ${t.reached ? 'text-gray-900' : 'text-gray-400'}`}>
                <span aria-hidden>{t.reached ? '●' : '○'}</span>
                <span className="flex-1">{t.status}</span>
                <span className="text-xs">{formatTanggal(t.timestamp)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Toko */}
      <section className="card p-4">
        <Link href={`/toko/${order.shop.slug}`} className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0">
            {order.shop.logoUrl && (
              <SmartImage src={order.shop.logoUrl} alt="" fill sizes="40px" className="object-cover" />
            )}
          </div>
          <p className="font-medium flex-1">🏪 {order.shop.name}</p>
          <span className="text-primary text-sm">›</span>
        </Link>
      </section>

      {/* Items */}
      <section className="card p-4">
        <h2 className="font-semibold mb-2">Produk Dipesan</h2>
        <div className="space-y-2">
          {order.items.map((it) => (
            <div key={it.id} className="flex gap-3 text-sm">
              <div className="relative w-12 h-12 rounded bg-gray-100 overflow-hidden shrink-0">
                {it.productImage && (
                  <SmartImage src={it.productImage} alt="" fill sizes="48px" className="object-cover" />
                )}
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

      {/* Alamat */}
      {addr && (
        <section className="card p-4">
          <h2 className="font-semibold mb-1">📍 Alamat Pengiriman</h2>
          <p className="text-sm">{addr.recipientName} · {addr.recipientPhone}</p>
          <p className="text-sm text-gray-600">
            {addr.fullAddress}, {addr.subdistrict}, {addr.district}, {addr.city}, {addr.province} {addr.postalCode}
          </p>
        </section>
      )}

      {/* Catatan */}
      {order.notes && (
        <section className="card p-4">
          <h2 className="font-semibold mb-1">📝 Catatan</h2>
          <p className="text-sm">{order.notes}</p>
        </section>
      )}

      {/* Pembayaran */}
      <section className="card p-4 text-sm space-y-1">
        <h2 className="font-semibold mb-2">Detail Pembayaran</h2>
        <div className="flex justify-between"><span>Metode</span><span>{order.paymentMethod}</span></div>
        <div className="flex justify-between"><span>Subtotal Produk</span><span>{formatRupiah(order.subtotal)}</span></div>
        <div className="flex justify-between"><span>Ongkir</span><span>{formatRupiah(order.shippingCost)}</span></div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between text-primary">
            <span>Diskon{order.promoCode ? ` (${order.promoCode})` : ''}</span>
            <span>−{formatRupiah(order.discountAmount)}</span>
          </div>
        )}
        <hr className="my-1" />
        <div className="flex justify-between font-semibold">
          <span>Total</span><span className="text-primary">{formatRupiah(order.total)}</span>
        </div>
      </section>

      {/* Status refund */}
      {order.refundRequest && (
        <section className="card p-4 text-sm">
          <h2 className="font-semibold mb-1">↩️ Pengajuan Refund</h2>
          <p className="text-gray-600">Alasan: {order.refundRequest.reason}</p>
          <p className="mt-1">
            Status:{' '}
            <span className={
              order.refundRequest.status === 'APPROVED' ? 'text-green-700'
                : order.refundRequest.status === 'REJECTED' ? 'text-red-600'
                : 'text-orange-600'
            }>
              {order.refundRequest.status === 'PENDING' ? 'Menunggu peninjauan admin'
                : order.refundRequest.status === 'APPROVED' ? 'Disetujui — dana dikembalikan'
                : order.refundRequest.status === 'REJECTED' ? 'Ditolak'
                : 'Selesai'}
            </span>
          </p>
          {order.refundRequest.adminNote && (
            <p className="text-xs text-gray-500 mt-1">Catatan admin: {order.refundRequest.adminNote}</p>
          )}
        </section>
      )}

      {msg && (
        <p className="card px-3 py-2 text-sm text-center bg-primary-50 text-primary">{msg}</p>
      )}

      {/* Aksi sesuai status */}
      <section className="card p-4 flex flex-wrap gap-2 sticky bottom-16 md:bottom-0">
        {order.status === 'PENDING_PAYMENT' && order.paymentMethod === 'QRIS_MOCK' && (
          <Link href={`/pesanan/${order.id}/bayar`} className="btn-primary flex-1 text-center">
            Bayar dengan QRIS
          </Link>
        )}
        {order.status === 'PENDING_PAYMENT' && order.paymentMethod === 'TRANSFER_MANUAL' && (
          <Link href={`/pesanan/${order.id}/bayar`} className="btn-primary flex-1 text-center">
            Upload Bukti Transfer
          </Link>
        )}
        {(['PENDING_PAYMENT', 'PAID', 'PROCESSING'] as const).includes(order.status as 'PAID') && (
          <button onClick={handleCancel} disabled={busy} className="btn-outline flex-1 text-red-600">
            Batalkan Pesanan
          </button>
        )}
        {order.status === 'DELIVERED' && (
          <button onClick={handleComplete} disabled={busy} className="btn-primary flex-1">
            Selesaikan Pesanan
          </button>
        )}
        {order.status === 'COMPLETED' && (
          <Link href="/pesanan/ulasan" className="btn-primary flex-1 text-center">
            ⭐ Beri Ulasan
          </Link>
        )}
        {(['DELIVERED', 'COMPLETED'] as const).includes(order.status as 'DELIVERED') && !order.refundRequest && (
          <button onClick={handleRefund} disabled={busy} className="btn-outline text-red-600">
            ↩️ Ajukan Refund
          </button>
        )}
        {/* Komplain hanya dalam 2 hari sejak barang diterima (M10-A7). */}
        {bisaKomplain && (
          <button onClick={() => setComplaintOpen(true)} disabled={busy} className="btn-outline text-red-600">
            📦 Komplain Barang
          </button>
        )}
        {/* Invoice baru ada setelah pesanan dibayar (M13-A2) — aturannya di
            `canViewInvoice`, dipakai juga oleh guard halaman invoice-nya. */}
        {canViewInvoice(order.status) && (
          <Link href={`/pesanan/${order.id}/invoice`} className="btn-outline" data-testid="lihat-invoice">
            🧾 Lihat Invoice
          </Link>
        )}
        <Link href={`/chat?shop=${order.shop.slug}`} className="btn-outline">
          💬 Chat Penjual
        </Link>
      </section>

      {complaintOpen && (
        <ComplaintModal
          orderId={order.id}
          items={order.items.map((it) => ({
            id: it.id,
            productName: it.productName,
            quantity: it.quantity,
            price: it.price,
          }))}
          onClose={() => setComplaintOpen(false)}
          onSubmitted={load}
        />
      )}
    </div>
  );
}
