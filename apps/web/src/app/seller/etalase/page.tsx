'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatRupiah, MAX_SHOWCASES_PER_SHOP, MAX_PRODUCTS_PER_SHOWCASE } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listSellerShowcases, getSellerShowcase, createSellerShowcase, updateSellerShowcase,
  deleteSellerShowcase, assignShowcaseProducts, moveSellerShowcase,
  listSellerProducts,
  type SellerShowcaseRow, type SellerProductRow,
} from '@/lib/api/seller';
import { ApiClientError } from '@/lib/api/client';

export default function SellerEtalasePage() {
  const { tokens } = useAuthStore();
  const token = tokens?.accessToken;

  const [items, setItems] = useState<SellerShowcaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Modal rename/create
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SellerShowcaseRow | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Modal picker produk
  const [pickerFor, setPickerFor] = useState<SellerShowcaseRow | null>(null);
  const [products, setProducts] = useState<SellerProductRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try { setItems(await listSellerShowcases(token)); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  function openCreate() {
    setEditing(null); setName(''); setFormError(null); setFormOpen(true);
  }

  function openRename(s: SellerShowcaseRow) {
    setEditing(s); setName(s.name); setFormError(null); setFormOpen(true);
  }

  async function handleSubmitName() {
    if (!token) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) { setFormError('Nama etalase minimal 2 karakter'); return; }
    setBusy(true); setFormError(null);
    try {
      if (editing) await updateSellerShowcase(token, editing.id, { name: trimmed });
      else await createSellerShowcase(token, { name: trimmed });
      setFormOpen(false);
      await refresh();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Gagal menyimpan etalase');
    } finally { setBusy(false); }
  }

  async function handleDelete(s: SellerShowcaseRow) {
    if (!token) return;
    if (!confirm(`Hapus etalase "${s.name}"? Produknya tidak ikut terhapus.`)) return;
    setBusy(true); setMsg(null);
    try { await deleteSellerShowcase(token, s.id); await refresh(); }
    catch (err) { setMsg(err instanceof ApiClientError ? err.message : 'Gagal menghapus'); }
    finally { setBusy(false); }
  }

  async function handleMove(s: SellerShowcaseRow, direction: 'up' | 'down') {
    if (!token) return;
    setBusy(true); setMsg(null);
    try { await moveSellerShowcase(token, s.id, direction); await refresh(); }
    catch (err) { setMsg(err instanceof ApiClientError ? err.message : 'Gagal mengubah urutan'); }
    finally { setBusy(false); }
  }

  // Buka picker: isi centang dari etalase saat ini. Daftar produknya diambil
  // oleh effect pencarian di bawah.
  async function openPicker(s: SellerShowcaseRow) {
    if (!token) return;
    setPickerFor(s); setPickerError(null); setQ('');
    setProducts([]); setSelected(new Set());
    try {
      const detail = await getSellerShowcase(token, s.id);
      setSelected(new Set(detail.products.map((p) => p.product.id)));
    } catch (err) {
      setPickerError(err instanceof ApiClientError ? err.message : 'Gagal memuat etalase');
    }
  }

  // Pencarian produk ditangani server — kalau difilter di client, produk di luar
  // halaman pertama akan tampak "tidak ada" padahal ada.
  useEffect(() => {
    if (!pickerFor || !token) return;
    let cancelled = false;
    setPickerLoading(true);
    const t = setTimeout(() => {
      listSellerProducts(token, { q: q.trim() || undefined, page: 1, limit: 50 })
        .then((list) => { if (!cancelled) setProducts(list.items); })
        .catch((err) => {
          if (!cancelled) setPickerError(err instanceof ApiClientError ? err.message : 'Gagal memuat produk');
        })
        .finally(() => { if (!cancelled) setPickerLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [pickerFor, q, token]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= MAX_PRODUCTS_PER_SHOWCASE) return prev;
        next.add(id);
      }
      return next;
    });
  }

  async function handleSaveProducts() {
    if (!token || !pickerFor) return;
    setBusy(true); setPickerError(null);
    try {
      await assignShowcaseProducts(token, pickerFor.id, [...selected]);
      setPickerFor(null);
      await refresh();
    } catch (err) {
      setPickerError(err instanceof ApiClientError ? err.message : 'Gagal menyimpan produk');
    } finally { setBusy(false); }
  }

  const atLimit = items.length >= MAX_SHOWCASES_PER_SHOP;

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">🗂️ Etalase Toko</h1>
          <p className="text-sm text-gray-500">
            Kelompokkan produk jadi etalase — tampil sebagai tab di halaman tokomu.
          </p>
        </div>
        <button onClick={openCreate} disabled={atLimit} className="btn-primary shrink-0">
          + Buat Etalase
        </button>
      </div>

      {atLimit && (
        <p className="text-xs text-orange-700 bg-orange-50 px-3 py-2 rounded">
          Sudah mencapai batas {MAX_SHOWCASES_PER_SHOP} etalase. Hapus salah satu untuk menambah yang baru.
        </p>
      )}
      {msg && <p className="card px-3 py-2 text-sm bg-orange-50 text-orange-700">{msg}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      {!loading && items.length === 0 && (
        <div className="card p-8 text-center text-gray-600">
          Belum ada etalase. Buat yang pertama — misalnya &ldquo;Best Seller&rdquo; atau &ldquo;Diskon&rdquo;. 🗂️
        </div>
      )}

      <div className="space-y-3">
        {items.map((s, i) => (
          <div key={s.id} className="card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{s.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {s._count.products} produk · <span className="font-mono">/{s.slug}</span>
                </p>
                {s._count.products === 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Etalase kosong — belum tampil di halaman toko.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => handleMove(s, 'up')}
                  disabled={busy || i === 0}
                  aria-label={`Naikkan ${s.name}`}
                  className="btn-outline px-2 py-0.5 text-xs disabled:opacity-30"
                >▲</button>
                <button
                  onClick={() => handleMove(s, 'down')}
                  disabled={busy || i === items.length - 1}
                  aria-label={`Turunkan ${s.name}`}
                  className="btn-outline px-2 py-0.5 text-xs disabled:opacity-30"
                >▼</button>
              </div>
            </div>
            <div className="flex gap-2 pt-1 text-sm flex-wrap">
              <button onClick={() => openPicker(s)} disabled={busy} className="btn-outline px-3 py-1">
                📦 Atur Produk
              </button>
              <button onClick={() => openRename(s)} disabled={busy} className="btn-outline px-3 py-1">
                ✏️ Ganti Nama
              </button>
              <button onClick={() => handleDelete(s)} disabled={busy} className="btn-outline px-3 py-1 text-red-600">
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal create / rename */}
      {formOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={() => setFormOpen(false)}
        >
          <div
            className="bg-white w-full md:max-w-md md:rounded-card"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold">{editing ? 'Ganti Nama Etalase' : 'Buat Etalase'}</h2>
              <button onClick={() => setFormOpen(false)} aria-label="Tutup" className="text-gray-500 text-xl">✕</button>
            </header>
            <div className="p-4 space-y-3">
              <div>
                <p className="label">Nama Etalase</p>
                <input
                  className="input w-full"
                  placeholder="mis. Best Seller"
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              {editing && (
                <p className="text-xs text-gray-500">
                  Alamat etalase (<span className="font-mono">/{editing.slug}</span>) tidak ikut berubah
                  supaya tautan yang sudah dibagikan tetap hidup.
                </p>
              )}
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <button onClick={handleSubmitName} disabled={busy} className="btn-primary w-full">
                {busy ? 'Menyimpan...' : editing ? 'Simpan' : 'Buat Etalase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal picker produk */}
      {pickerFor && (
        <div
          className="fixed inset-0 z-40 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={() => setPickerFor(null)}
        >
          <div
            className="bg-white w-full md:max-w-lg md:rounded-card max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-4 py-3 border-b flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h2 className="font-semibold truncate">Atur Produk · {pickerFor.name}</h2>
                <p className="text-xs text-gray-500">
                  {selected.size} / {MAX_PRODUCTS_PER_SHOWCASE} terpilih
                </p>
              </div>
              <button onClick={() => setPickerFor(null)} aria-label="Tutup" className="text-gray-500 text-xl">✕</button>
            </header>

            <div className="px-4 py-2 border-b shrink-0">
              <input
                className="input w-full"
                placeholder="Cari produk..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {pickerLoading && <p className="text-sm text-gray-500">Memuat produk...</p>}
              {!pickerLoading && products.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">
                  {q.trim() ? 'Tidak ada produk yang cocok.' : 'Belum ada produk di tokomu.'}
                </p>
              )}
              {products.map((p) => {
                const checked = selected.has(p.id);
                const blocked = !checked && selected.size >= MAX_PRODUCTS_PER_SHOWCASE;
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer ${
                      checked ? 'border-primary bg-primary-50' : 'border-gray-200'
                    } ${blocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={blocked}
                      onChange={() => toggleSelect(p.id)}
                      className="shrink-0"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.images[0]?.url ?? ''}
                      alt=""
                      loading="lazy"
                      className="w-10 h-10 rounded object-cover bg-gray-100 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm truncate">{p.name}</span>
                      <span className="block text-xs text-gray-500">
                        {formatRupiah(p.price)} · stok {p.stock}
                        {!p.isActive && ' · nonaktif'}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="p-4 border-t shrink-0 space-y-2">
              {pickerError && <p className="text-sm text-red-600">{pickerError}</p>}
              <p className="text-xs text-gray-500">
                Daftar menampilkan maks. 50 produk — pakai kolom cari untuk menemukan sisanya.
                Produk nonaktif atau stok habis tetap bisa dipilih, tapi tidak tampil ke pembeli.
              </p>
              <button onClick={handleSaveProducts} disabled={busy} className="btn-primary w-full">
                {busy ? 'Menyimpan...' : 'Simpan Produk Etalase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
