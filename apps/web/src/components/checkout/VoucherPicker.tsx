'use client';

import { useEffect, useState } from 'react';
import { formatRupiah, formatTanggal } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { listAvailableVouchers, type AvailableVouchers, type VoucherInfo } from '@/lib/api/promo';

interface VoucherPickerProps {
  subtotal: number;
  // Terisi kalau checkout hanya berisi 1 toko — voucher toko ikut ditampilkan (M9-B2).
  shopId?: string;
  currentCode: string | null;
  onApply: (code: string) => Promise<void>; // parent validasi via /promo/validate
  onClose: () => void;
}

function voucherTag(v: VoucherInfo): string {
  return v.discountType === 'PERCENTAGE' ? `Diskon ${v.discountValue}%` : `Potongan ${formatRupiah(v.discountValue)}`;
}

export function VoucherPicker({ subtotal, shopId, currentCode, onApply, onClose }: VoucherPickerProps) {
  const { tokens } = useAuthStore();
  const [data, setData] = useState<AvailableVouchers | null>(null);
  const [selected, setSelected] = useState<string | null>(currentCode);
  const [manualCode, setManualCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    listAvailableVouchers(tokens.accessToken, subtotal, shopId)
      .then(setData)
      .catch(() => setData({ eligible: [], ineligible: [] }));
  }, [tokens?.accessToken, subtotal, shopId]);

  async function handleApply(code: string | null) {
    if (!code) return;
    setBusy(true); setError(null);
    try {
      await onApply(code);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voucher tidak bisa dipakai');
    } finally { setBusy(false); }
  }

  const selectedVoucher = data?.eligible.find((v) => v.code === selected);

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg md:rounded-card max-h-[90vh] overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="px-4 py-3 border-b sticky top-0 bg-white flex items-center justify-between z-10">
          <h2 className="font-semibold">🎟️ Pakai Voucher</h2>
          <button onClick={onClose} aria-label="Tutup" className="text-gray-500 text-xl">✕</button>
        </header>

        <div className="p-4 space-y-3 flex-1">
          {/* Input manual — fallback */}
          <div className="flex gap-2">
            <input
              className="input flex-1 uppercase"
              placeholder="Punya kode? Masukkan di sini"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            />
            <button
              onClick={() => handleApply(manualCode.trim() || null)}
              disabled={busy || !manualCode.trim()}
              className="btn-outline"
            >Pakai</button>
          </div>

          {!data && <p className="text-sm text-gray-500 py-4 text-center">Memuat voucher...</p>}

          {data && data.eligible.length === 0 && data.ineligible.length === 0 && (
            <p className="text-sm text-gray-500 py-4 text-center">Belum ada voucher tersedia saat ini.</p>
          )}

          {data && data.eligible.length > 0 && (
            <div>
              <p className="label mb-1.5">Bisa dipakai</p>
              <div className="space-y-2">
                {data.eligible.map((v) => (
                  <label
                    key={v.code}
                    className={
                      'flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition-colors ' +
                      (selected === v.code ? 'border-primary bg-primary-50' : 'border-gray-200 hover:border-gray-300')
                    }
                  >
                    <input
                      type="radio"
                      name="voucher"
                      className="mt-1"
                      checked={selected === v.code}
                      onChange={() => setSelected(v.code)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{v.code}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-100 text-primary font-semibold">
                          {voucherTag(v)}
                        </span>
                        {v.shopName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-semibold">
                            🏪 {v.shopName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {v.minPurchase > 0 ? `Min. belanja ${formatRupiah(v.minPurchase)} · ` : ''}
                        s.d. {formatTanggal(v.validUntil)}
                      </p>
                      <p className="text-xs text-primary font-semibold mt-0.5">
                        Hemat {formatRupiah(v.discountAmount)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {data && data.ineligible.length > 0 && (
            <div>
              <p className="label mb-1.5">Belum bisa dipakai</p>
              <div className="space-y-2">
                {data.ineligible.map(({ promo, reason }) => (
                  <div key={promo.code} className="flex items-start gap-3 border border-gray-200 rounded-lg p-3 opacity-60">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{promo.code}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">
                          {voucherTag(promo)}
                        </span>
                      </div>
                      <p className="text-xs text-red-600 mt-0.5">{reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <footer className="px-4 py-3 border-t sticky bottom-0 bg-white">
          <button
            onClick={() => handleApply(selected)}
            disabled={busy || !selected}
            className="btn-primary w-full"
          >
            {busy ? 'Memproses...' : selectedVoucher
              ? `Pakai ${selectedVoucher.code} — hemat ${formatRupiah(selectedVoucher.discountAmount)}`
              : 'Pakai Voucher'}
          </button>
        </footer>
      </div>
    </div>
  );
}
