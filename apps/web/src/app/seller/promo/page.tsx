'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatRupiah, formatTanggal } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listSellerVouchers, createSellerVoucher, updateSellerVoucher, deleteSellerVoucher,
  type SellerVoucherRow,
} from '@/lib/api/seller';
import { ApiClientError } from '@/lib/api/client';

const EMPTY_FORM = {
  code: '',
  discountType: 'FIXED' as 'FIXED' | 'PERCENTAGE',
  discountValue: '',
  minPurchase: '',
  maxDiscount: '',
  usageLimit: '',
  validFrom: '',
  validUntil: '',
};

// ISO → format input datetime-local ("YYYY-MM-DDTHH:mm", waktu lokal).
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SellerPromoPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<SellerVoucherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SellerVoucherRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try { setItems(await listSellerVouchers(tokens.accessToken)); }
    finally { setLoading(false); }
  }, [tokens?.accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(v: SellerVoucherRow) {
    setEditing(v);
    setForm({
      code: v.code,
      discountType: v.discountType,
      discountValue: String(v.discountValue),
      minPurchase: String(v.minPurchase),
      maxDiscount: v.maxDiscount ? String(v.maxDiscount) : '',
      usageLimit: v.usageLimit ? String(v.usageLimit) : '',
      validFrom: toLocalInput(v.validFrom),
      validUntil: toLocalInput(v.validUntil),
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmit() {
    if (!tokens?.accessToken) return;
    const discountValue = Number(form.discountValue);
    if (!discountValue || discountValue < 1) { setFormError('Nilai diskon wajib diisi'); return; }
    if (form.discountType === 'PERCENTAGE' && discountValue > 100) { setFormError('Diskon persen maksimal 100%'); return; }
    if (!form.validFrom || !form.validUntil) { setFormError('Periode voucher wajib diisi'); return; }

    const payload = {
      discountType: form.discountType,
      discountValue,
      minPurchase: Number(form.minPurchase) || 0,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      validFrom: new Date(form.validFrom).toISOString(),
      validUntil: new Date(form.validUntil).toISOString(),
    };

    setBusy(true); setFormError(null);
    try {
      if (editing) {
        await updateSellerVoucher(tokens.accessToken, editing.id, payload);
      } else {
        if (form.code.trim().length < 3) { setFormError('Kode minimal 3 karakter'); setBusy(false); return; }
        await createSellerVoucher(tokens.accessToken, { ...payload, code: form.code.trim().toUpperCase() });
      }
      setFormOpen(false);
      await refresh();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Gagal menyimpan voucher');
    } finally { setBusy(false); }
  }

  async function handleToggleActive(v: SellerVoucherRow) {
    if (!tokens?.accessToken) return;
    setBusy(true); setMsg(null);
    try {
      await updateSellerVoucher(tokens.accessToken, v.id, { isActive: !v.isActive });
      await refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal mengubah status');
    } finally { setBusy(false); }
  }

  async function handleDelete(v: SellerVoucherRow) {
    if (!tokens?.accessToken) return;
    if (!confirm(`Hapus voucher ${v.code}?`)) return;
    setBusy(true); setMsg(null);
    try {
      await deleteSellerVoucher(tokens.accessToken, v.id);
      await refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal menghapus');
    } finally { setBusy(false); }
  }

  const now = new Date();

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">🎟️ Voucher Toko</h1>
          <p className="text-sm text-gray-500">Voucher khusus tokomu — muncul di Voucher Picker checkout pembeli.</p>
        </div>
        <button onClick={openCreate} className="btn-primary shrink-0">+ Buat Voucher</button>
      </div>

      {msg && <p className="card px-3 py-2 text-sm bg-orange-50 text-orange-700">{msg}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {!loading && items.length === 0 && (
        <div className="card p-8 text-center text-gray-600">
          Belum ada voucher. Buat voucher pertamamu untuk menarik pembeli! 🎉
        </div>
      )}

      <div className="space-y-3">
        {items.map((v) => {
          const expired = new Date(v.validUntil) < now;
          const quotaFull = v.usageLimit != null && v.usedCount >= v.usageLimit;
          return (
            <div key={v.id} className={`card p-4 space-y-2 ${!v.isActive || expired ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{v.code}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-100 text-primary font-semibold">
                      {v.discountType === 'PERCENTAGE' ? `Diskon ${v.discountValue}%` : `Potongan ${formatRupiah(v.discountValue)}`}
                    </span>
                    {expired ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Kedaluwarsa</span>
                    ) : v.isActive ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">Aktif</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Dijeda</span>
                    )}
                    {quotaFull && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">Kuota habis</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {v.minPurchase > 0 ? `Min. belanja ${formatRupiah(v.minPurchase)} · ` : ''}
                    {v.maxDiscount ? `Maks. diskon ${formatRupiah(v.maxDiscount)} · ` : ''}
                    {formatTanggal(v.validFrom)} – {formatTanggal(v.validUntil)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Terpakai {v.usedCount}{v.usageLimit ? ` / ${v.usageLimit}` : ''} kali
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1 text-sm">
                {!expired && (
                  <button onClick={() => handleToggleActive(v)} disabled={busy} className="btn-outline px-3 py-1">
                    {v.isActive ? '⏸ Jeda' : '▶ Aktifkan'}
                  </button>
                )}
                <button onClick={() => openEdit(v)} disabled={busy} className="btn-outline px-3 py-1">✏️ Edit</button>
                <button onClick={() => handleDelete(v)} disabled={busy} className="btn-outline px-3 py-1 text-red-600">Hapus</button>
              </div>
            </div>
          );
        })}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setFormOpen(false)}>
          <div className="bg-white w-full md:max-w-lg md:rounded-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <header className="px-4 py-3 border-b sticky top-0 bg-white flex items-center justify-between">
              <h2 className="font-semibold">{editing ? `Edit Voucher ${editing.code}` : 'Buat Voucher Toko'}</h2>
              <button onClick={() => setFormOpen(false)} aria-label="Tutup" className="text-gray-500 text-xl">✕</button>
            </header>
            <div className="p-4 space-y-3">
              {!editing && (
                <div>
                  <p className="label">Kode Voucher</p>
                  <input
                    className="input w-full uppercase"
                    placeholder="mis. TOKOHEMAT10"
                    maxLength={20}
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="label">Jenis Diskon</p>
                  <select
                    className="input w-full"
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value as 'FIXED' | 'PERCENTAGE' })}
                  >
                    <option value="FIXED">Potongan Rp</option>
                    <option value="PERCENTAGE">Diskon %</option>
                  </select>
                </div>
                <div>
                  <p className="label">{form.discountType === 'PERCENTAGE' ? 'Persen (%)' : 'Nominal (Rp)'}</p>
                  <input
                    className="input w-full"
                    type="number"
                    min={1}
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="label">Min. Belanja (Rp)</p>
                  <input
                    className="input w-full" type="number" min={0} placeholder="0"
                    value={form.minPurchase}
                    onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
                  />
                </div>
                <div>
                  <p className="label">Maks. Diskon (Rp) <span className="text-gray-400">— utk %</span></p>
                  <input
                    className="input w-full" type="number" min={1} placeholder="Tanpa batas"
                    value={form.maxDiscount}
                    onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <p className="label">Kuota Total <span className="text-gray-400">(kosongkan = tanpa batas)</span></p>
                <input
                  className="input w-full" type="number" min={1} placeholder="Tanpa batas"
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="label">Mulai</p>
                  <input
                    className="input w-full" type="datetime-local"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                  />
                </div>
                <div>
                  <p className="label">Berakhir</p>
                  <input
                    className="input w-full" type="datetime-local"
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                  />
                </div>
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <button onClick={handleSubmit} disabled={busy} className="btn-primary w-full">
                {busy ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
