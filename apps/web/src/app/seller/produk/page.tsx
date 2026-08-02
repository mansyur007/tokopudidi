'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SmartImage } from '@/components/media/SmartImage';
import { formatRupiah } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listSellerProducts,
  deleteSellerProduct,
  duplicateSellerProduct,
  updateSellerProduct,
  bulkUpdateSellerProducts,
  type BulkProductItem,
  type SellerProductRow,
} from '@/lib/api/seller';
import { ApiClientError } from '@/lib/api/client';

const TABS = [
  { key: 'ALL',       label: 'Semua' },
  { key: 'ACTIVE',    label: 'Aktif' },
  { key: 'INACTIVE',  label: 'Nonaktif' },
  { key: 'LOW_STOCK', label: 'Stok Menipis' },
];

/** Nilai yang sedang diketik untuk satu baris. String supaya input terkendali. */
interface DraftRow { price: string; stock: string; isActive: boolean }

const toDraft = (p: SellerProductRow): DraftRow => ({
  price: String(p.price), stock: String(p.stock), isActive: p.isActive,
});

/**
 * Perubahan satu baris terhadap data aslinya — `null` kalau tidak ada yang
 * berubah. Baris tak berubah tidak boleh ikut terkirim: server menolaknya, dan
 * kalau lolos, angka "N produk diperbarui" jadi lebih besar dari kenyataan.
 */
function diffRow(p: SellerProductRow, d: DraftRow): BulkProductItem | null {
  const item: BulkProductItem = { id: p.id };
  let berubah = false;

  const price = Number(d.price);
  if (d.price.trim() !== '' && Number.isFinite(price) && price !== p.price) {
    item.price = price; berubah = true;
  }
  const stock = Number(d.stock);
  if (d.stock.trim() !== '' && Number.isFinite(stock) && stock !== p.stock) {
    item.stock = stock; berubah = true;
  }
  if (d.isActive !== p.isActive) { item.isActive = d.isActive; berubah = true; }

  return berubah ? item : null;
}

export default function SellerProductListPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<SellerProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');
  const [q, setQ] = useState('');

  // ===== Edit massal (M14-B2) =====
  const [bulkMode, setBulkMode] = useState(false);
  const [draft, setDraft] = useState<Record<string, DraftRow>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string[]>>({});
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const changed = items
    .map((p) => (draft[p.id] ? diffRow(p, draft[p.id]) : null))
    .filter((x): x is BulkProductItem => x !== null);

  // Validasi client sebelum request — ambangnya sama dengan zod di server.
  const invalid = changed.some(
    (c) => (c.price !== undefined && c.price < 100) || (c.stock !== undefined && c.stock < 0),
  );

  function enterBulk() {
    setDraft(Object.fromEntries(items.map((p) => [p.id, toDraft(p)])));
    setRowErrors({});
    setBulkMsg(null);
    setBulkMode(true);
  }

  function cancelBulk() {
    setBulkMode(false);
    setDraft({});
    setRowErrors({});
  }

  async function saveBulk() {
    if (!tokens?.accessToken || changed.length === 0 || invalid) return;
    setSaving(true); setRowErrors({}); setBulkMsg(null);
    try {
      const res = await bulkUpdateSellerProducts(tokens.accessToken, changed);
      setBulkMode(false);
      setDraft({});
      setBulkMsg(`${res.updated} produk diperbarui`);
      await refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        // 422 mengirim alasan per id produk — ditandai di barisnya masing-masing
        // supaya seller tahu baris mana yang harus dibetulkan, bukan cuma bahwa
        // penyimpanannya gagal. Mode edit sengaja TIDAK ditutup: menutupnya akan
        // membuang semua ketikan yang belum tersimpan.
        setRowErrors(err.errors ?? {});
        setBulkMsg(err.message);
      } else {
        setBulkMsg('Gagal menyimpan perubahan');
      }
    } finally { setSaving(false); }
  }

  async function refresh() {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      const r = await listSellerProducts(tokens.accessToken, { status: tab, q: q || undefined });
      setItems(r.items);
    } finally { setLoading(false); }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [tokens?.accessToken, tab]);

  async function handleDelete(id: string) {
    if (!tokens?.accessToken) return;
    if (!confirm('Yakin hapus produk ini?')) return;
    await deleteSellerProduct(tokens.accessToken, id);
    refresh();
  }

  async function handleDuplicate(id: string) {
    if (!tokens?.accessToken) return;
    await duplicateSellerProduct(tokens.accessToken, id);
    refresh();
  }

  async function toggleActive(p: SellerProductRow) {
    if (!tokens?.accessToken) return;
    await updateSellerProduct(tokens.accessToken, p.id, { isActive: !p.isActive });
    refresh();
  }

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-5xl">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Produk Saya</h1>
        <div className="flex items-center gap-2">
          {!bulkMode && items.length > 0 && (
            <button onClick={enterBulk} data-testid="bulk-start" className="btn-outline text-sm">
              ✏️ Edit Massal
            </button>
          )}
          <Link href="/seller/produk/baru" className="btn-primary text-sm">+ Tambah Produk</Link>
        </div>
      </header>

      {bulkMsg && !bulkMode && (
        <p data-testid="bulk-message" className="card px-3 py-2 text-sm bg-green-50 text-green-700">{bulkMsg}</p>
      )}

      <div className="flex gap-2 items-center">
        <form
          onSubmit={(e) => { e.preventDefault(); refresh(); }}
          className="flex-1"
        >
          <input
            className="input"
            placeholder="Cari produk..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>
        <button onClick={refresh} className="btn-outline text-sm">Cari</button>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              'shrink-0 px-3 py-1.5 rounded-full text-sm border ' +
              (tab === t.key ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300 text-gray-700')
            }
          >{t.label}</button>
        ))}
      </nav>

      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      {!loading && items.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-gray-600 mb-3">Belum ada produk di sini.</p>
          <Link href="/seller/produk/baru" className="btn-primary">+ Tambah Produk Pertama</Link>
        </div>
      )}

      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="card p-3 flex gap-3 items-start">
            <div className="relative w-16 h-16 rounded bg-gray-100 overflow-hidden shrink-0">
              {p.images[0] && (
                <SmartImage src={p.images[0].url} alt="" fill sizes="64px" className="object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium line-clamp-1">{p.name}</p>

              {bulkMode && draft[p.id] ? (
                <>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <label className="text-xs text-gray-600">
                      Harga (Rp)
                      <input
                        type="number" min={100} inputMode="numeric"
                        data-testid={`bulk-price-${p.id}`}
                        className="input w-full mt-0.5 py-1 text-sm"
                        value={draft[p.id].price}
                        onChange={(e) => setDraft({ ...draft, [p.id]: { ...draft[p.id], price: e.target.value } })}
                      />
                    </label>
                    <label className="text-xs text-gray-600">
                      Stok
                      <input
                        type="number" min={0} inputMode="numeric"
                        data-testid={`bulk-stock-${p.id}`}
                        className="input w-full mt-0.5 py-1 text-sm"
                        value={draft[p.id].stock}
                        onChange={(e) => setDraft({ ...draft, [p.id]: { ...draft[p.id], stock: e.target.value } })}
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-700 mt-1.5">
                    <input
                      type="checkbox"
                      data-testid={`bulk-active-${p.id}`}
                      checked={draft[p.id].isActive}
                      onChange={(e) => setDraft({ ...draft, [p.id]: { ...draft[p.id], isActive: e.target.checked } })}
                    />
                    Aktif
                  </label>
                  {rowErrors[p.id] && (
                    <p data-testid={`bulk-error-${p.id}`} className="text-xs text-red-600 mt-1">
                      {rowErrors[p.id].join(' ')}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500">
                    {formatRupiah(p.price)} · Stok {p.stock} · {p.soldCount} terjual
                  </p>
                  <p className="text-xs text-gray-500">
                    {p.category.name} · {p.isActive ? <span className="text-green-700">Aktif</span> : <span className="text-orange-700">Nonaktif</span>}
                    {p.stock < 5 && <span className="text-red-600 ml-2">Stok menipis!</span>}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    <Link href={`/seller/produk/${p.id}/edit`} className="btn-outline px-2 py-1 min-h-0">Edit</Link>
                    <Link href={`/seller/produk/${p.id}/statistik`} className="btn-outline px-2 py-1 min-h-0">📈 Statistik</Link>
                    <button onClick={() => handleDuplicate(p.id)} className="btn-outline px-2 py-1 min-h-0">Duplikat</button>
                    <button onClick={() => toggleActive(p)} className="btn-outline px-2 py-1 min-h-0">
                      {p.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="btn-outline px-2 py-1 min-h-0 text-red-600">Hapus</button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bar aksi edit massal — menempel di bawah layar supaya tombol Simpan
          tetap terjangkau saat daftar produknya panjang. */}
      {bulkMode && (
        <div className="sticky bottom-0 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-white border-t flex items-center gap-2 flex-wrap">
          <span data-testid="bulk-dirty-count" className="text-sm text-gray-600 flex-1">
            {changed.length === 0
              ? 'Belum ada perubahan'
              : `${changed.length} produk diubah`}
            {invalid && <span className="text-red-600 ml-2">Harga min. Rp 100, stok tidak boleh negatif</span>}
          </span>
          {bulkMsg && <span className="text-sm text-red-600 w-full order-last">{bulkMsg}</span>}
          <button onClick={cancelBulk} disabled={saving} className="btn-outline text-sm">Batal</button>
          <button
            onClick={saveBulk}
            data-testid="bulk-save"
            disabled={saving || changed.length === 0 || invalid}
            className="btn-primary text-sm"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      )}
    </div>
  );
}
