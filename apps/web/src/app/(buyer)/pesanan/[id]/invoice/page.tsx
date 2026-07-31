'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  formatRupiah,
  formatTanggal,
  formatTanggalWaktu,
  canViewInvoice,
  invoiceNumber,
} from '@tokopudidi/shared';
import { useAuthStore, useAuthHydrated } from '@/store/auth';
import { getOrder, type OrderDetail } from '@/lib/api/orders';

const METODE_LABEL: Record<string, string> = {
  COD: 'Bayar di Tempat (COD)',
  TRANSFER_MANUAL: 'Transfer Bank',
  QRIS_MOCK: 'QRIS',
};

interface AlamatSnapshot {
  recipientName: string;
  recipientPhone: string;
  fullAddress: string;
  subdistrict: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
}

/**
 * `name` opsional dengan sengaja: snapshot toko dari checkout memang menulis
 * `{ name, city, province }`, tapi pesanan lama (mis. data seed) hanya punya
 * `{ city, province }`. Karena itu nama toko selalu punya cadangan dari relasi
 * `order.shop` — tanpa itu invoice pesanan lama keluar tanpa nama penjual.
 */
interface TokoSnapshot {
  name?: string;
  city: string;
  province: string | null;
}

/**
 * Invoice printable per pesanan (M13-A2) — cetak lewat browser, bukan generator
 * PDF. Semua isinya dari snapshot yang tersimpan di order (`buyerAddress`,
 * `shopAddress`, `OrderItem.productName/price/subtotal`), jadi dokumennya tetap
 * memperlihatkan keadaan saat transaksi walau produk atau alamatnya berubah.
 */
export default function InvoicePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, tokens } = useAuthStore();
  const hydrated = useAuthHydrated();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [ditolak, setDitolak] = useState(false);

  useEffect(() => {
    // Sebelum rehydrate selesai `user` selalu null — menyimpulkan "belum login"
    // di sini membuang pemilik pesanan ke /masuk setiap kali invoice dibuka
    // lewat URL langsung, yang justru cara halaman ini dipakai.
    if (!hydrated) return;
    if (!user || !tokens?.accessToken) { router.replace('/masuk'); return; }

    let alive = true;
    getOrder(tokens.accessToken, id)
      .then((o) => {
        if (!alive) return;
        // Guard akses langsung: pesanan yang belum dibayar / batal / sudah
        // direfund tidak punya invoice, jadi jangan render dokumennya.
        if (!canViewInvoice(o.status)) { setDitolak(true); return; }
        setOrder(o);
      })
      // Bukan pemilik pesanan -> API sudah menolak; tidak perlu guard kedua di sini.
      .catch(() => { if (alive) setDitolak(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [hydrated, user, tokens?.accessToken, id, router]);

  if (!hydrated || loading) {
    return <div className="px-4 py-8 text-center text-sm text-gray-500">Memuat invoice...</div>;
  }

  if (ditolak || !order) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-gray-600 mb-3">
          Invoice belum tersedia untuk pesanan ini.
        </p>
        <Link href={`/pesanan/${id}`} className="btn-outline inline-block">
          Kembali ke Detail Pesanan
        </Link>
      </div>
    );
  }

  const alamat = order.buyerAddress as AlamatSnapshot | null;
  const toko = order.shopAddress as TokoSnapshot | null;

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 14mm; }
        @media print {
          body { background: #fff !important; }
          .invoice-sheet { box-shadow: none !important; border: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div className="bg-gray-100 print:bg-white py-6 px-4 print:p-0">
        <div className="invoice-sheet bg-white border border-gray-200 rounded-lg shadow-sm max-w-[190mm] mx-auto p-8 print:rounded-none text-sm text-gray-800">
          {/* Kepala dokumen */}
          <div className="flex justify-between items-start gap-4 border-b pb-4">
            <div>
              <p className="text-lg font-extrabold tracking-tight">
                toko<span className="text-primary">pudidi</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Marketplace UMKM Indonesia</p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold">INVOICE</p>
              <p className="font-mono text-xs mt-0.5">{invoiceNumber(order.orderNumber)}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Tanggal pesan: {formatTanggal(order.createdAt)}
              </p>
              {order.paidAt && (
                <p className="text-xs text-gray-500">
                  Dibayar: {formatTanggalWaktu(order.paidAt)}
                </p>
              )}
            </div>
          </div>

          {/* Penjual & pembeli */}
          <div className="grid grid-cols-2 gap-6 py-4 border-b">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Penjual</p>
              <p className="font-semibold">{toko?.name ?? order.shop.name}</p>
              {toko && (
                <p className="text-xs text-gray-600">
                  {toko.city}{toko.province ? `, ${toko.province}` : ''}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Ditagihkan kepada</p>
              {alamat ? (
                <>
                  <p className="font-semibold">{alamat.recipientName}</p>
                  <p className="text-xs text-gray-600">{alamat.recipientPhone}</p>
                  <p className="text-xs text-gray-600">
                    {alamat.fullAddress}, {alamat.subdistrict}, {alamat.district},{' '}
                    {alamat.city}, {alamat.province} {alamat.postalCode}
                  </p>
                </>
              ) : (
                <p className="font-semibold">{user?.fullName}</p>
              )}
            </div>
          </div>

          {/* Rincian item */}
          <table className="w-full mt-4 text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-gray-500">
                <th className="text-left font-medium py-2">Produk</th>
                <th className="text-right font-medium py-2 w-16">Qty</th>
                <th className="text-right font-medium py-2 w-32">Harga</th>
                <th className="text-right font-medium py-2 w-32">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.id} className="border-b border-gray-100 align-top">
                  <td className="py-2 pr-2">
                    {it.productName}
                    {it.variantName && (
                      <span className="block text-xs text-gray-500">Varian: {it.variantName}</span>
                    )}
                  </td>
                  <td className="py-2 text-right">{it.quantity}</td>
                  <td className="py-2 text-right">{formatRupiah(it.price)}</td>
                  <td className="py-2 text-right">{formatRupiah(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Ringkasan biaya */}
          <div className="flex justify-end mt-4">
            <dl className="w-full max-w-xs space-y-1">
              <div className="flex justify-between">
                <dt>Subtotal Produk</dt>
                <dd>{formatRupiah(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Ongkos Kirim</dt>
                <dd>{formatRupiah(order.shippingCost)}</dd>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between">
                  <dt>Diskon{order.promoCode ? ` (${order.promoCode})` : ''}</dt>
                  <dd>−{formatRupiah(order.discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 font-bold text-base">
                <dt>Total</dt>
                <dd data-testid="invoice-total">{formatRupiah(order.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 pt-3 border-t text-xs text-gray-600 space-y-0.5">
            <p>Metode pembayaran: {METODE_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
            <p>Nomor pesanan: {order.orderNumber}</p>
            {order.trackingNumber && (
              <p>
                Pengiriman: {order.courierName ? `${order.courierName} · ` : ''}
                {order.trackingNumber}
              </p>
            )}
          </div>

          <p className="mt-6 text-[11px] text-gray-400 text-center">
            Dokumen ini dibuat otomatis oleh sistem Tokopudidi dan sah tanpa tanda tangan.
          </p>
        </div>

        {/* Kontrol layar — tidak ikut tercetak. */}
        <div className="print:hidden max-w-[190mm] mx-auto mt-4 flex gap-2 justify-end">
          <Link href={`/pesanan/${order.id}`} className="btn-outline">Kembali</Link>
          <button type="button" onClick={() => window.print()} className="btn-primary">
            🖨️ Cetak / Simpan PDF
          </button>
        </div>
      </div>
    </>
  );
}
