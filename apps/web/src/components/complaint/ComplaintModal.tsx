'use client';

import { useState } from 'react';
import {
  COMPLAINT_TYPE_LABEL,
  COMPLAINT_RESOLUTION_LABEL,
  type ComplaintTypeValue,
  type ComplaintResolutionValue,
} from '@tokopudidi/shared';
import { formatRupiah } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { createComplaint } from '@/lib/api/complaints';
import { ApiClientError } from '@/lib/api/client';

interface OrderItemOption {
  id: string;
  productName: string;
  quantity: number;
  price: number;
}

interface Props {
  orderId: string;
  items: OrderItemOption[];
  onClose: () => void;
  onSubmitted: () => void;
}

const TYPES = Object.keys(COMPLAINT_TYPE_LABEL) as ComplaintTypeValue[];
const RESOLUTIONS = Object.keys(COMPLAINT_RESOLUTION_LABEL) as ComplaintResolutionValue[];

export function ComplaintModal({ orderId, items, onClose, onSubmitted }: Props) {
  const { tokens } = useAuthStore();
  const [orderItemId, setOrderItemId] = useState(items[0]?.id ?? '');
  const [type, setType] = useState<ComplaintTypeValue>('BROKEN');
  const [resolutionType, setResolutionType] = useState<ComplaintResolutionValue>('REFUND');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (evidenceUrls.length >= 3) { setError('Maksimal 3 file bukti'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Maksimal 2MB per file'); return; }
    const reader = new FileReader();
    reader.onload = () => setEvidenceUrls((prev) => [...prev, String(reader.result)]);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleSubmit() {
    if (!tokens?.accessToken) return;
    if (!orderItemId) { setError('Pilih barang yang bermasalah'); return; }
    if (description.trim().length < 10) { setError('Ceritakan masalahnya minimal 10 karakter'); return; }
    setBusy(true); setError(null);
    try {
      await createComplaint(tokens.accessToken, orderId, {
        orderItemId,
        type,
        resolutionType,
        description: description.trim(),
        evidenceUrls: evidenceUrls.length ? evidenceUrls : undefined,
      });
      setDone(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal mengirim komplain');
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg md:rounded-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <header className="px-4 py-3 border-b sticky top-0 bg-white flex items-center justify-between">
          <h2 className="font-semibold">📦 Ajukan Komplain</h2>
          <button onClick={onClose} aria-label="Tutup" className="text-gray-500 text-xl">✕</button>
        </header>

        {done ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-3xl" aria-hidden>✅</p>
            <p className="font-medium">Komplain terkirim!</p>
            <p className="text-sm text-gray-600">
              Penjual akan menanggapi. Kalau ditolak, kamu bisa menaikkan kasusnya ke admin dari halaman Komplain.
            </p>
            <button onClick={onClose} className="btn-primary w-full">Tutup</button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div>
              <p className="label">Barang yang bermasalah</p>
              <select className="input w-full" value={orderItemId} onChange={(e) => setOrderItemId(e.target.value)}>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.productName} · {it.quantity}× {formatRupiah(it.price)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="label">Masalahnya apa?</p>
              <div className="space-y-1">
                {TYPES.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                    <input type="radio" name="complaint-type" checked={type === t} onChange={() => setType(t)} />
                    <span>{COMPLAINT_TYPE_LABEL[t]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="label">Maunya diselesaikan bagaimana?</p>
              <div className="flex gap-2">
                {RESOLUTIONS.map((r) => (
                  <label
                    key={r}
                    className={`flex-1 flex items-center gap-2 border rounded p-2 text-sm cursor-pointer ${
                      resolutionType === r ? 'border-primary bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="complaint-resolution"
                      checked={resolutionType === r}
                      onChange={() => setResolutionType(r)}
                    />
                    <span>{COMPLAINT_RESOLUTION_LABEL[r]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="label">Ceritakan masalahnya</p>
              <textarea
                className="input w-full min-h-[80px]"
                maxLength={1000}
                placeholder="Contoh: paket sampai dalam keadaan penyok dan layar retak."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <p className="label">Foto bukti <span className="text-gray-400">(opsional, max 3 file @2MB)</span></p>
              <div className="flex gap-2 flex-wrap">
                {evidenceUrls.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded border overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Bukti ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setEvidenceUrls((prev) => prev.filter((_, j) => j !== i))}
                      aria-label="Hapus bukti"
                      className="absolute top-0 right-0 bg-black/60 text-white text-xs px-1"
                    >✕</button>
                  </div>
                ))}
                {evidenceUrls.length < 3 && (
                  <label className="w-16 h-16 rounded border-2 border-dashed flex items-center justify-center text-2xl text-gray-400 cursor-pointer hover:border-primary">
                    +
                    <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                  </label>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button onClick={handleSubmit} disabled={busy} className="btn-primary w-full">
              {busy ? 'Mengirim...' : 'Kirim Komplain'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
