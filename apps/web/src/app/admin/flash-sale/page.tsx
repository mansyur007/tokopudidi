'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatRupiah, formatTanggal } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listAdminFlashSales, getAdminFlashSale, createAdminFlashSale, updateAdminFlashSale,
  deleteAdminFlashSale, addAdminFlashSaleItem, updateAdminFlashSaleItem, deleteAdminFlashSaleItem,
  type AdminFlashSaleRow, type AdminFlashSaleDetail,
} from '@/lib/api/flashSale';
import { listProducts, type ProductCard } from '@/lib/api/products';
import { ApiClientError } from '@/lib/api/client';

const EMPTY_EVENT = { name: '', startAt: '', endAt: '' };
const EMPTY_ITEM = { productId: '', salePrice: '', quota: '' };

// ISO → nilai input datetime-local ("YYYY-MM-DDTHH:mm", waktu lokal).
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusEvent(e: { startAt: string; endAt: string; isActive: boolean }, now: Date) {
  if (!e.isActive) return { label: 'Dijeda', cls: 'bg-orange-100 text-orange-700' };
  if (new Date(e.endAt) <= now) return { label: 'Selesai', cls: 'bg-gray-100 text-gray-600' };
  if (new Date(e.startAt) > now) return { label: 'Terjadwal', cls: 'bg-blue-100 text-blue-700' };
  return { label: 'Berjalan', cls: 'bg-green-100 text-green-700' };
}

export default function AdminFlashSalePage() {
  const { tokens } = useAuthStore();
  const token = tokens?.accessToken;

  const [rows, setRows] = useState<AdminFlashSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [eventForm, setEventForm] = useState(EMPTY_EVENT);
  const [editingEvent, setEditingEvent] = useState<AdminFlashSaleRow | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  // Panel slot untuk satu event — dibuka dari daftar.
  const [detail, setDetail] = useState<AdminFlashSaleDetail | null>(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [itemError, setItemError] = useState<string | null>(null);
  const [cari, setCari] = useState('');
  const [hasilCari, setHasilCari] = useState<ProductCard[]>([]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try { setRows(await listAdminFlashSales(token)); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  async function bukaDetail(id: string) {
    if (!token) return;
    setItemError(null);
    setItemForm(EMPTY_ITEM);
    setCari(''); setHasilCari([]);
    setDetail(await getAdminFlashSale(token, id));
  }

  async function simpanEvent() {
    if (!token) return;
    if (eventForm.name.trim().length < 3) { setEventError('Nama event minimal 3 karakter'); return; }
    if (!eventForm.startAt || !eventForm.endAt) { setEventError('Periode wajib diisi'); return; }
    if (new Date(eventForm.endAt) <= new Date(eventForm.startAt)) {
      setEventError('Waktu berakhir harus setelah waktu mulai'); return;
    }
    const payload = {
      name: eventForm.name.trim(),
      startAt: new Date(eventForm.startAt).toISOString(),
      endAt: new Date(eventForm.endAt).toISOString(),
    };
    setBusy(true); setEventError(null);
    try {
      if (editingEvent) await updateAdminFlashSale(token, editingEvent.id, payload);
      else await createAdminFlashSale(token, payload);
      setEventOpen(false);
      await refresh();
      if (detail && editingEvent?.id === detail.id) await bukaDetail(detail.id);
    } catch (err) {
      setEventError(err instanceof ApiClientError ? err.message : 'Gagal menyimpan event');
    } finally { setBusy(false); }
  }

  async function toggleAktif(e: AdminFlashSaleRow) {
    if (!token) return;
    setBusy(true); setMsg(null);
    try {
      await updateAdminFlashSale(token, e.id, { isActive: !e.isActive });
      await refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal mengubah status');
    } finally { setBusy(false); }
  }

  async function hapusEvent(e: AdminFlashSaleRow) {
    if (!token) return;
    if (!confirm(`Hapus event "${e.name}" beserta ${e._count.items} slot produknya?`)) return;
    setBusy(true); setMsg(null);
    try {
      await deleteAdminFlashSale(token, e.id);
      if (detail?.id === e.id) setDetail(null);
      await refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal menghapus event');
    } finally { setBusy(false); }
  }

  async function cariProduk() {
    if (cari.trim().length < 2) return;
    const res = await listProducts({ q: cari.trim(), limit: 8 }).catch(() => null);
    setHasilCari(res?.items ?? []);
  }

  async function tambahSlot() {
    if (!token || !detail) return;
    const salePrice = Number(itemForm.salePrice);
    const quota = Number(itemForm.quota);
    if (!itemForm.productId) { setItemError('Pilih produk dulu'); return; }
    if (!salePrice || salePrice < 100) { setItemError('Harga flash minimal Rp 100'); return; }
    if (!quota || quota < 1) { setItemError('Kuota minimal 1'); return; }

    setBusy(true); setItemError(null);
    try {
      const hasil = await addAdminFlashSaleItem(token, detail.id, {
        productId: itemForm.productId, salePrice, quota,
      });
      // Peringatan server (mis. kuota > stok) tetap ditampilkan walau slotnya
      // berhasil dibuat — admin perlu tahu tanpa aksinya dibatalkan.
      if (hasil.warnings?.length) setMsg(`⚠️ ${hasil.warnings.join(' · ')}`);
      setItemForm(EMPTY_ITEM); setCari(''); setHasilCari([]);
      await bukaDetail(detail.id);
      await refresh();
    } catch (err) {
      setItemError(err instanceof ApiClientError ? err.message : 'Gagal menambah produk');
    } finally { setBusy(false); }
  }

  async function ubahSlot(itemId: string, body: { salePrice?: number; quota?: number }) {
    if (!token || !detail) return;
    setBusy(true); setMsg(null);
    try {
      const hasil = await updateAdminFlashSaleItem(token, detail.id, itemId, body);
      if (hasil.warnings?.length) setMsg(`⚠️ ${hasil.warnings.join(' · ')}`);
      await bukaDetail(detail.id);
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal mengubah slot');
    } finally { setBusy(false); }
  }

  async function hapusSlot(itemId: string, nama: string) {
    if (!token || !detail) return;
    if (!confirm(`Keluarkan "${nama}" dari event ini?`)) return;
    setBusy(true); setMsg(null);
    try {
      await deleteAdminFlashSaleItem(token, detail.id, itemId);
      await bukaDetail(detail.id);
      await refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal menghapus slot');
    } finally { setBusy(false); }
  }

  const now = new Date();
  const produkTerpilih = hasilCari.find((p) => p.id === itemForm.productId);

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">⚡ Flash Sale</h1>
          <p className="text-sm text-gray-500">
            Event terjadwal dengan harga khusus & kuota. Kuota habis → harga otomatis kembali normal.
          </p>
        </div>
        <button
          onClick={() => { setEditingEvent(null); setEventForm(EMPTY_EVENT); setEventError(null); setEventOpen(true); }}
          className="btn-primary shrink-0"
        >+ Buat Event</button>
      </div>

      {msg && <p className="card px-3 py-2 text-sm bg-orange-50 text-orange-700">{msg}</p>}
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {!loading && rows.length === 0 && (
        <div className="card p-8 text-center text-gray-600">Belum ada event flash sale.</div>
      )}

      <div className="space-y-3">
        {rows.map((e) => {
          const st = statusEvent(e, now);
          const terbuka = detail?.id === e.id;
          return (
            <div key={e.id} className="card p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{e.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${st.cls}`}>{st.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                  {e._count.items} produk
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {formatTanggal(e.startAt)} – {formatTanggal(e.endAt)}
              </p>
              <div className="flex gap-2 pt-1 text-sm flex-wrap">
                <button
                  onClick={() => (terbuka ? setDetail(null) : bukaDetail(e.id))}
                  disabled={busy}
                  className="btn-outline px-3 py-1"
                >{terbuka ? '▲ Tutup' : '📦 Kelola Produk'}</button>
                <button onClick={() => toggleAktif(e)} disabled={busy} className="btn-outline px-3 py-1">
                  {e.isActive ? '⏸ Jeda' : '▶ Aktifkan'}
                </button>
                <button
                  onClick={() => {
                    setEditingEvent(e);
                    setEventForm({ name: e.name, startAt: toLocalInput(e.startAt), endAt: toLocalInput(e.endAt) });
                    setEventError(null); setEventOpen(true);
                  }}
                  disabled={busy}
                  className="btn-outline px-3 py-1"
                >✏️ Edit</button>
                <button onClick={() => hapusEvent(e)} disabled={busy} className="btn-outline px-3 py-1 text-red-600">
                  Hapus
                </button>
              </div>

              {terbuka && detail && (
                <div className="pt-3 mt-2 border-t space-y-3">
                  {detail.items.length === 0 && (
                    <p className="text-sm text-gray-500">Belum ada produk di event ini.</p>
                  )}
                  {detail.items.map((it) => (
                    <div key={it.id} className="flex items-start gap-3 border rounded-lg p-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{it.product.name}</p>
                        <p className="text-xs text-gray-500">
                          {it.product.shop.name} · normal {formatRupiah(it.product.price)} · stok {it.product.stock}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <label className="text-xs text-gray-500">
                            Harga
                            <input
                              type="number" min={100} defaultValue={it.salePrice}
                              className="input ml-1 w-28 py-0.5 text-sm"
                              onBlur={(e) => {
                                const v = Number(e.target.value);
                                if (v && v !== it.salePrice) ubahSlot(it.id, { salePrice: v });
                              }}
                            />
                          </label>
                          <label className="text-xs text-gray-500">
                            Kuota
                            <input
                              type="number" min={1} defaultValue={it.quota}
                              className="input ml-1 w-20 py-0.5 text-sm"
                              onBlur={(e) => {
                                const v = Number(e.target.value);
                                if (v && v !== it.quota) ubahSlot(it.id, { quota: v });
                              }}
                            />
                          </label>
                          <span className="text-xs text-gray-500">terjual {it.soldCount}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => hapusSlot(it.id, it.product.name)}
                        disabled={busy}
                        className="btn-outline px-2 py-1 text-red-600 text-xs shrink-0"
                      >Hapus</button>
                    </div>
                  ))}

                  <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
                    <p className="text-sm font-semibold">Tambah Produk</p>
                    <div className="flex gap-2">
                      <input
                        className="input flex-1" placeholder="Cari nama produk..."
                        value={cari}
                        onChange={(ev) => setCari(ev.target.value)}
                        onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); cariProduk(); } }}
                      />
                      <button onClick={cariProduk} className="btn-outline px-3">Cari</button>
                    </div>
                    {hasilCari.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {hasilCari.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setItemForm({ ...itemForm, productId: p.id })}
                            className={`w-full text-left text-sm px-2 py-1.5 rounded border ${itemForm.productId === p.id ? 'border-primary bg-primary-50' : 'border-gray-200 bg-white'}`}
                          >
                            <span className="truncate block">{p.name}</span>
                            <span className="text-xs text-gray-500">{formatRupiah(p.price)} · {p.shop.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {produkTerpilih && (
                      <p className="text-xs text-gray-600">
                        Dipilih: <strong>{produkTerpilih.name}</strong> — harga flash harus di bawah{' '}
                        {formatRupiah(produkTerpilih.price)}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="input" type="number" min={100} placeholder="Harga flash (Rp)"
                        value={itemForm.salePrice}
                        onChange={(ev) => setItemForm({ ...itemForm, salePrice: ev.target.value })}
                      />
                      <input
                        className="input" type="number" min={1} placeholder="Kuota"
                        value={itemForm.quota}
                        onChange={(ev) => setItemForm({ ...itemForm, quota: ev.target.value })}
                      />
                    </div>
                    {itemError && <p className="text-sm text-red-600">{itemError}</p>}
                    <button onClick={tambahSlot} disabled={busy} className="btn-primary w-full">
                      {busy ? 'Menyimpan...' : 'Tambahkan ke Event'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {eventOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setEventOpen(false)}>
          <div className="bg-white w-full md:max-w-lg md:rounded-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <header className="px-4 py-3 border-b sticky top-0 bg-white flex items-center justify-between">
              <h2 className="font-semibold">{editingEvent ? `Edit ${editingEvent.name}` : 'Buat Event Flash Sale'}</h2>
              <button onClick={() => setEventOpen(false)} aria-label="Tutup" className="text-gray-500 text-xl">✕</button>
            </header>
            <div className="p-4 space-y-3">
              <div>
                <p className="label">Nama Event</p>
                <input
                  className="input w-full" maxLength={60} placeholder="mis. Flash Sale Gajian"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="label">Mulai</p>
                  <input
                    className="input w-full" type="datetime-local"
                    value={eventForm.startAt}
                    onChange={(e) => setEventForm({ ...eventForm, startAt: e.target.value })}
                  />
                </div>
                <div>
                  <p className="label">Berakhir</p>
                  <input
                    className="input w-full" type="datetime-local"
                    value={eventForm.endAt}
                    onChange={(e) => setEventForm({ ...eventForm, endAt: e.target.value })}
                  />
                </div>
              </div>
              {eventError && <p className="text-sm text-red-600">{eventError}</p>}
              <button onClick={simpanEvent} disabled={busy} className="btn-primary w-full">
                {busy ? 'Menyimpan...' : editingEvent ? 'Simpan Perubahan' : 'Buat Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
