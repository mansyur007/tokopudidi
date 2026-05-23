'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import {
  listAdminBanners, createBanner, updateBanner, deleteBanner,
  type AdminBanner,
} from '@/lib/api/admin';
import { ApiClientError } from '@/lib/api/client';

const PLACEMENTS = [
  { key: 'HOME_TOP', label: 'Beranda Atas' },
  { key: 'HOME_MIDDLE', label: 'Beranda Tengah' },
  { key: 'CATEGORY_PAGE', label: 'Halaman Kategori' },
];

type Draft = {
  id?: string;
  imageUrl: string;
  linkUrl: string;
  placement: AdminBanner['placement'];
  order: number;
  isActive: boolean;
};

const EMPTY: Draft = { imageUrl: '', linkUrl: '', placement: 'HOME_TOP', order: 0, isActive: true };

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminBannerPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try { setItems(await listAdminBanners(tokens.accessToken)); }
    finally { setLoading(false); }
  }, [tokens?.accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !draft) return;
    if (file.size > 2 * 1024 * 1024) { setMsg('Maksimal 2MB ya'); return; }
    setDraft({ ...draft, imageUrl: await fileToDataUrl(file) });
  }

  async function save() {
    if (!tokens?.accessToken || !draft) return;
    if (!draft.imageUrl || draft.imageUrl.length < 5) { setMsg('Gambar banner wajib diisi'); return; }
    setBusy(true); setMsg(null);
    try {
      const body = {
        imageUrl: draft.imageUrl,
        linkUrl: draft.linkUrl || undefined,
        placement: draft.placement,
        order: draft.order,
        isActive: draft.isActive,
      };
      if (draft.id) await updateBanner(tokens.accessToken, draft.id, body);
      else await createBanner(tokens.accessToken, body);
      setDraft(null); await refresh();
    } catch (err) { setMsg(err instanceof ApiClientError ? err.message : 'Gagal menyimpan'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!tokens?.accessToken) return;
    if (!confirm('Hapus banner ini?')) return;
    setBusy(true); setMsg(null);
    try { await deleteBanner(tokens.accessToken, id); await refresh(); }
    catch (err) { setMsg(err instanceof ApiClientError ? err.message : 'Gagal menghapus'); }
    finally { setBusy(false); }
  }

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Banner</h1>
        <button onClick={() => setDraft({ ...EMPTY })} className="btn-primary">+ Banner</button>
      </div>

      {msg && <p className="card px-3 py-2 text-sm bg-orange-50 text-orange-700">{msg}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {!loading && items.length === 0 && (
        <div className="card p-8 text-center text-gray-600">Belum ada banner.</div>
      )}

      <div className="space-y-2">
        {items.map((b) => (
          <div key={b.id} className="card p-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.imageUrl} alt="banner" className="w-24 h-12 object-cover rounded bg-gray-100 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{PLACEMENTS.find((p) => p.key === b.placement)?.label}</p>
              <p className="text-xs text-gray-500 truncate">Urutan {b.order} · {b.linkUrl || 'tanpa link'}</p>
              {!b.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">Nonaktif</span>}
            </div>
            <button onClick={() => setDraft({ id: b.id, imageUrl: b.imageUrl, linkUrl: b.linkUrl ?? '', placement: b.placement, order: b.order, isActive: b.isActive })} className="text-xs px-2 py-1 rounded border">Edit</button>
            <button onClick={() => remove(b.id)} className="text-xs px-2 py-1 rounded border text-red-600 border-red-300">Hapus</button>
          </div>
        ))}
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setDraft(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b font-semibold">{draft.id ? 'Edit Banner' : 'Banner Baru'}</div>
            <div className="p-4 space-y-3 text-sm">
              {draft.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.imageUrl} alt="preview" className="w-full rounded border" />
              )}
              <label className="block">
                <span className="text-xs text-gray-500">Gambar (maks 2MB)</span>
                <input type="file" accept="image/*" onChange={onPickImage} className="block w-full text-xs mt-1" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Atau tempel URL gambar</span>
                <input value={draft.imageUrl.startsWith('data:') ? '' : draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} placeholder="https://..." className="w-full border rounded-lg px-3 py-2 mt-1" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Link tujuan (opsional)</span>
                <input value={draft.linkUrl} onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })} placeholder="/produk/..." className="w-full border rounded-lg px-3 py-2 mt-1" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs text-gray-500">Penempatan</span>
                  <select value={draft.placement} onChange={(e) => setDraft({ ...draft, placement: e.target.value as AdminBanner['placement'] })} className="w-full border rounded-lg px-3 py-2 mt-1">
                    {PLACEMENTS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Urutan</span>
                  <input type="number" value={draft.order} onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 mt-1" />
                </label>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                <span>Aktif</span>
              </label>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button disabled={busy} onClick={save} className="btn-primary flex-1">Simpan</button>
              <button onClick={() => setDraft(null)} className="btn-outline flex-1">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
