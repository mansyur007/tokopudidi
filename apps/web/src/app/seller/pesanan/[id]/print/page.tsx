'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { getSellerOrder, type SellerOrderDetail } from '@/lib/api/seller';

// Halaman print label pengiriman A6 — sederhana, monokrom, siap-cetak.
export default function PrintLabelPage() {
  const { id } = useParams<{ id: string }>();
  const { tokens } = useAuthStore();
  const [order, setOrder] = useState<SellerOrderDetail | null>(null);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    getSellerOrder(tokens.accessToken, id).then(setOrder);
  }, [tokens?.accessToken, id]);

  useEffect(() => {
    if (order) setTimeout(() => window.print(), 300);
  }, [order]);

  if (!order) return <div className="p-6">Memuat label...</div>;

  const addr = order.buyerAddress as null | {
    label: string; recipientName: string; recipientPhone: string;
    fullAddress: string; subdistrict: string; district: string;
    city: string; province: string; postalCode: string;
  };

  return (
    <>
      <style>{`
        @page { size: A6 portrait; margin: 6mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none; }
          .label-page { box-shadow: none; border: 0; padding: 0; margin: 0 auto; }
        }
      `}</style>
      <div className="bg-gray-100 min-h-screen p-6 flex justify-center">
        <div className="label-page bg-white border border-black p-3 w-[105mm] text-xs leading-tight">
          <div className="text-center font-bold border-b border-black pb-1 mb-2">
            TOKOPUDIDI · {order.orderNumber}
          </div>

          <p className="font-semibold">KEPADA:</p>
          <p>{addr?.recipientName}</p>
          <p>{addr?.recipientPhone}</p>
          <p>{addr?.fullAddress}</p>
          <p>{addr?.subdistrict}, {addr?.district}</p>
          <p>{addr?.city}, {addr?.province} {addr?.postalCode}</p>

          <hr className="my-2 border-black" />

          <p className="font-semibold">DARI:</p>
          <p className="text-xs">(Toko penjual)</p>

          <hr className="my-2 border-black" />

          <p className="font-semibold">ISI ({order.items.length} item):</p>
          <ul className="list-disc list-inside">
            {order.items.map((it) => (
              <li key={it.id}>{it.productName} × {it.quantity}</li>
            ))}
          </ul>

          <hr className="my-2 border-black" />

          <p>Berat: {order.items.reduce((s, _) => s, 0) || '-'} gr</p>
          <p>Kurir: {order.shippingMethod}</p>
          <p>Resi: {order.trackingNumber ?? '-'}</p>

          <div className="mt-2 text-center font-mono text-base tracking-widest">
            *{order.orderNumber}*
          </div>
        </div>
        <div className="no-print fixed top-4 right-4">
          <button onClick={() => window.print()} className="btn-primary">Cetak</button>
        </div>
      </div>
    </>
  );
}
