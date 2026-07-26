'use client';

import Link from 'next/link';
import {
  COMPLAINT_TYPE_LABEL,
  COMPLAINT_RESOLUTION_LABEL,
  COMPLAINT_STATUS_LABEL,
  formatRupiah,
  formatTanggalWaktu,
  type ComplaintStatusValue,
} from '@tokopudidi/shared';
import type { Complaint } from '@/lib/api/complaints';

const STATUS_COLOR: Record<ComplaintStatusValue, string> = {
  OPEN: 'bg-orange-100 text-orange-700',
  SELLER_RESPONDED: 'bg-yellow-100 text-yellow-800',
  ESCALATED: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-gray-100 text-gray-700',
};

interface Props {
  complaint: Complaint;
  /** Sudut pandang pembaca — menentukan info tambahan yang relevan. */
  perspective: 'buyer' | 'seller' | 'admin';
  /** Tombol aksi (respond / escalate / decide) dirender pemanggil. */
  actions?: React.ReactNode;
}

export function ComplaintCard({ complaint: c, perspective, actions }: Props) {
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">
            {c.order.orderNumber} · {formatTanggalWaktu(c.createdAt)}
          </p>
          <p className="font-medium truncate">{c.orderItem.productName}</p>
          <p className="text-xs text-gray-500">
            {c.orderItem.quantity}× {formatRupiah(c.orderItem.price)}
            {perspective !== 'seller' && ` · ${c.order.shop.name}`}
            {perspective !== 'buyer' && ` · ${c.buyer.fullName}`}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded shrink-0 ${STATUS_COLOR[c.status]}`}>
          {COMPLAINT_STATUS_LABEL[c.status]}
        </span>
      </div>

      <div className="text-sm space-y-1">
        <p>
          <span className="text-gray-500">Masalah:</span> {COMPLAINT_TYPE_LABEL[c.type]} ·{' '}
          <span className="text-gray-500">minta</span> {COMPLAINT_RESOLUTION_LABEL[c.resolutionType]}
        </p>
        <p className="text-gray-700">{c.description}</p>
      </div>

      {c.evidenceUrls.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {c.evidenceUrls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt={`Bukti ${i + 1}`} className="w-16 h-16 object-cover rounded border" />
          ))}
        </div>
      )}

      {c.sellerResponse && (
        <p className="text-sm bg-gray-50 rounded p-2">
          <span className="text-gray-500">Tanggapan penjual:</span> {c.sellerResponse}
        </p>
      )}
      {c.adminDecision && (
        <p className="text-sm bg-purple-50 rounded p-2">
          <span className="text-gray-500">Keputusan admin:</span> {c.adminDecision}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Link
          href={perspective === 'seller' ? `/seller/pesanan/${c.order.id}` : `/pesanan/${c.order.id}`}
          className="text-xs text-primary underline"
        >
          Lihat pesanan
        </Link>
        <div className="ml-auto flex gap-2">{actions}</div>
      </div>
    </div>
  );
}
