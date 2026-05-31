'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import {
  getSellerShop,
  updateSellerShop,
  toggleShopOpen,
  type SellerShop,
} from '@/lib/api/seller';
import { ApiClientError } from '@/lib/api/client';

export default function SellerSettingsPage() {
  const { tokens } = useAuthStore();
  const [shop, setShop] = useState<SellerShop | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try { setShop(await getSellerShop(tokens.accessToken)); }
    finally { setLoading(false); }
  }, [tokens?.accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  function setField<K extends keyof SellerShop>(key: K, val: SellerShop[K]) {
    setShop((prev) => (prev ? { ...prev, [key]: val } : prev));
  }

  async function handleSave() {
    if (!tokens?.accessToken || !shop) return;
    setBusy(true); setError(null); setMsg(null);
    try {
      await updateSellerShop(tokens.accessToken, {
        name: shop.name,
        description: shop.description ?? '',
        logoUrl: shop.logoUrl ?? '',
        bannerUrl: shop.bannerUrl ?? '',
        closedReason: shop.closedReason ?? '',
        bankName: shop.bankName ?? '',
        bankAccountNo: shop.bankAccountNo ?? '',
        bankAccountName: shop.bankAccountName ?? '',
        autoReplyText: shop.autoReplyText ?? '',
      });
      setMsg('Tersimpan');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal simpan');
    } finally { setBusy(false); }
  }

  async function handleToggleOpen() {
    if (!tokens?.accessToken || !shop) return;
    let reason: string | undefined;
    if (shop.isOpen) {
      const r = prompt('Alasan tutup toko (opsional):') ?? '';
      reason = r;
    }
    setBusy(true);
    try { await toggleShopOpen(tokens.accessToken, reason); await refresh(); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Memuat...</div>;
  if (!shop) return null;

  return (
    <div className="px-4 md:px-6 py-4 space-y-4 max-w-3xl">
      <h1 className="text-xl font-semibold">Pengaturan Toko</h1>

      <section className="card p-4 flex items-center justify-between">
        <div>
          <p className="font-medium">Status: {shop.isOpen ? '🟢 Buka' : '🟠 Tutup'}</p>
          {!shop.isOpen && shop.closedReason && (
            <p className="text-xs text-gray-500">{shop.closedReason}</p>
          )}
        </div>
        <button onClick={handleToggleOpen} disabled={busy} className="btn-outline">
          {shop.isOpen ? 'Tutup Sementara' : 'Buka Lagi'}
        </button>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Profil Toko</h2>
        <div>
          <label className="label">Nama Toko</label>
          <input className="input" value={shop.name} onChange={(e) => setField('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Deskripsi</label>
          <textarea className="input min-h-[80px]" value={shop.description ?? ''} onChange={(e) => setField('description', e.target.value)} maxLength={500} />
        </div>
        <div>
          <label className="label">Logo URL</label>
          <input className="input" value={shop.logoUrl ?? ''} onChange={(e) => setField('logoUrl', e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label className="label">Banner URL</label>
          <input className="input" value={shop.bannerUrl ?? ''} onChange={(e) => setField('bannerUrl', e.target.value)} placeholder="https://..." />
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Rekening Pencairan Dana</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Bank</label>
            <select className="input" value={shop.bankName ?? ''} onChange={(e) => setField('bankName', e.target.value)}>
              <option value="">Pilih</option>
              <option>BCA</option><option>BRI</option><option>Mandiri</option><option>BNI</option>
              <option>BSI</option><option>CIMB Niaga</option><option>Permata</option>
            </select>
          </div>
          <div>
            <label className="label">Nomor Rekening</label>
            <input className="input" value={shop.bankAccountNo ?? ''} onChange={(e) => setField('bankAccountNo', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Nama Pemilik Rekening</label>
          <input className="input" value={shop.bankAccountName ?? ''} onChange={(e) => setField('bankAccountName', e.target.value)} />
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Auto-reply Chat saat Tutup</h2>
        <textarea
          className="input min-h-[80px]"
          value={shop.autoReplyText ?? ''}
          onChange={(e) => setField('autoReplyText', e.target.value)}
          maxLength={300}
          placeholder="Contoh: Halo kak, toko lagi tutup. Pesan akan dibalas besok pagi ya."
        />
      </section>

      {msg && <p className="text-sm text-primary">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="sticky bottom-0 bg-white pt-3 border-t flex gap-2">
        <button onClick={handleSave} disabled={busy} className="btn-primary flex-1">
          {busy ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  );
}
