'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatRupiah } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listSellerProducts,
  deleteSellerProduct,
  duplicateSellerProduct,
  updateSellerProduct,
  type SellerProductRow,
} from '@/lib/api/seller';

const TABS = [
  { key: 'ALL',       label: 'Semua' },
  { key: 'ACTIVE',    label: 'Aktif' },
  { key: 'INACTIVE',  label: 'Nonaktif' },
  { key: 'LOW_STOCK', label: 'Stok Menipis' },
];

export default function SellerProductListPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<SellerProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');
  const [q, setQ] = useState('');

  async function refresh() {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      const r = await listSellerProducts(tokens.accessToken, { status: tab, q: q || undefined });
      setItems(r.items);
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [tokens?.accessToken, tab]);

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
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Produk Saya</h1>
        <Link href="/seller/produk/baru" className="btn-primary text-sm">+ Tambah Produk</Link>
      </header>

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
                <Image src={p.images[0].url} alt="" fill sizes="64px" className="object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium line-clamp-1">{p.name}</p>
              <p className="text-sm text-gray-500">
                {formatRupiah(p.price)} · Stok {p.stock} · {p.soldCount} terjual
              </p>
              <p className="text-xs text-gray-500">
                {p.category.name} · {p.isActive ? <span className="text-green-700">Aktif</span> : <span className="text-orange-700">Nonaktif</span>}
                {p.stock < 5 && <span className="text-red-600 ml-2">Stok menipis!</span>}
              </p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                <Link href={`/seller/produk/${p.id}/edit`} className="btn-outline px-2 py-1 min-h-0">Edit</Link>
                <button onClick={() => handleDuplicate(p.id)} className="btn-outline px-2 py-1 min-h-0">Duplikat</button>
                <button onClick={() => toggleActive(p)} className="btn-outline px-2 py-1 min-h-0">
                  {p.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button onClick={() => handleDelete(p.id)} className="btn-outline px-2 py-1 min-h-0 text-red-600">Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
