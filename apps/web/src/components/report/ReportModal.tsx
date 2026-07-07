'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { REPORT_REASONS, type ReportTargetType } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { createReport } from '@/lib/api/reports';
import { ApiClientError } from '@/lib/api/client';

interface ReportModalProps {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string; // mis. nama produk/toko untuk judul modal
  onClose: () => void;
}

const TARGET_LABEL: Record<ReportTargetType, string> = {
  PRODUCT: 'Produk',
  REVIEW: 'Ulasan',
  SHOP: 'Toko',
  DISCUSSION: 'Diskusi',
  USER: 'Pengguna',
};

export function ReportModal({ targetType, targetId, targetLabel, onClose }: ReportModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, tokens } = useAuthStore();
  const [reason, setReason] = useState('');
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
    if (!user || !tokens?.accessToken) {
      router.push(`/masuk?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!reason) { setError('Pilih alasan dulu'); return; }
    setBusy(true); setError(null);
    try {
      await createReport(tokens.accessToken, {
        targetType,
        targetId,
        reason,
        description: description.trim(),
        evidenceUrls: evidenceUrls.length ? evidenceUrls : undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal mengirim laporan');
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg md:rounded-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <header className="px-4 py-3 border-b sticky top-0 bg-white flex items-center justify-between">
          <h2 className="font-semibold">
            🚩 Laporkan {TARGET_LABEL[targetType]}{targetLabel ? `: ${targetLabel}` : ''}
          </h2>
          <button onClick={onClose} aria-label="Tutup" className="text-gray-500 text-xl">✕</button>
        </header>

        {done ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-3xl" aria-hidden>✅</p>
            <p className="font-medium">Laporan terkirim!</p>
            <p className="text-sm text-gray-600">Admin akan meninjau laporanmu. Kamu akan dapat notifikasi keputusannya.</p>
            <button onClick={onClose} className="btn-primary w-full">Tutup</button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div>
              <p className="label">Alasan</p>
              <div className="space-y-1">
                {REPORT_REASONS.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                    <input
                      type="radio"
                      name="report-reason"
                      checked={reason === r}
                      onChange={() => setReason(r)}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="label">Deskripsi <span className="text-gray-400">(opsional)</span></p>
              <textarea
                className="input w-full min-h-[80px]"
                maxLength={1000}
                placeholder="Jelaskan detail masalahnya..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <p className="label">Bukti <span className="text-gray-400">(opsional, max 3 file @2MB)</span></p>
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
              {busy ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
