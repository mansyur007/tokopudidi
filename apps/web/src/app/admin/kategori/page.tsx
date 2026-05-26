'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import {
  listAdminCategories, createCategory, updateCategory, deleteCategory,
  type AdminCategory,
} from '@/lib/api/admin';
import { ApiClientError } from '@/lib/api/client';

type Draft = {
  id?: string;
  name: string;
  parentId: string;
  order: number;
  isActive: boolean;
};

const EMPTY: Draft = { name: '', parentId: '', order: 0, isActive: true };

export default function AdminCategoryPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try { setItems(await listAdminCategories(tokens.accessToken)); }
    finally { setLoading(false); }
  }, [tokens?.accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  const parents = items.filter((c) => !c.parentId);
  const nameById = new Map(items.map((c) => [c.id, c.name]));

  async function save() {
    if (!tokens?.accessToken || !draft) return;
    if (draft.name.trim().length < 2) { setMsg('Nama kategori minimal 2 karakter'); return; }
    setBusy(true); setMsg(null);
    try {
      const body = {
        name: draft.name.trim(),
        parentId: draft.parentId || undefined,
        order: draft.order,
        isActive: draft.isActive,
      };
      if (draft.id) await updateCategory(tokens.accessToken, draft.id, body);
      else await createCategory(tokens.accessToken, body);
      setDraft(null); await refresh();
    } catch (err) { setMsg(err instanceof ApiClientError ? err.message : 'Gagal menyimpan'); }
    finally { setBusy(false); }
  }

  async function remove(c: AdminCategory) {
    if (!tokens?.accessToken) return;
    if (!confirm(`Hapus kategori "${c.name}"?`)) return;
    setBusy(true); setMsg(null);
    try { await deleteCategory(tokens.accessToken, c.id); await refresh(); }
    catch (err) { setMsg(err instanceof ApiClientError ? err.message : 'Gagal menghapus'); }
    finally { setBusy(false); }
  }

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kategori</h1>
        <button onClick={() => setDraft({ ...EMPTY })} className="btn-primary">+ Kategori</button>
      </div>

      {msg && <p className="card px-3 py-2 text-sm bg-orange-50 text-orange-700">{msg}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.id} className="card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">
                  {c.parentId && <span className="text-gray-400">{nameById.get(c.parentId)} › </span>}
                  {c.name}
                </p>
                {!c.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">Nonaktif</span>}
              </div>
              <p className="text-xs text-gray-500">/{c.slug} · {c._count.products} produk · {c._count.children} subkategori · urutan {c.order}</p>
            </div>
            <button onClick={() => setDraft({ id: c.id, name: c.name, parentId: c.parentId ?? '', order: c.order, isActive: c.isActive })} className="text-xs px-2 py-1 rounded border">Edit</button>
            <button onClick={() => remove(c)} className="text-xs px-2 py-1 rounded border text-red-600 border-red-300">Hapus</button>
          </div>
        ))}
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setDraft(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b font-semibold">{draft.id ? 'Edit Kategori' : 'Kategori Baru'}</div>
            <div className="p-4 space-y-3 text-sm">
              <label className="block">
                <span className="text-xs text-gray-500">Nama</span>
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Induk (opsional)</span>
                <select value={draft.parentId} onChange={(e) => setDraft({ ...draft, parentId: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1">
                  <option value="">— Kategori utama —</option>
                  {parents.filter((p) => p.id !== draft.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Urutan</span>
                <input type="number" value={draft.order} onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 mt-1" />
              </label>
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
