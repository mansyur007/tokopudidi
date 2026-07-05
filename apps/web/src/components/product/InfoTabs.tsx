'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ProductDetail } from '@/lib/api/products';
import { DiscussionThread } from './DiscussionThread';

const TABS = ['Detail Produk', 'Spesifikasi', 'Info Penting', 'Diskusi'] as const;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid items-start gap-2.5 leading-relaxed" style={{ gridTemplateColumns: '110px 1fr' }}>
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

export function InfoTabs({ product }: { product: ProductDetail }) {
  const [tab, setTab] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // Description bisa panjang — kasih opsi "Lihat Selengkapnya".
  const desc = product.description ?? '';
  const isLong = desc.length > 280;
  const shown = !isLong || expanded ? desc : desc.slice(0, 280) + '…';

  return (
    <div>
      <div className="flex gap-[22px] border-b border-line">
        {TABS.map((t, k) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(k)}
            data-active={tab === k}
            className="feed-tab text-sm shrink-0"
          >
            {t}
          </button>
        ))}
      </div>

      <div className="pt-4 text-[13.5px] text-ink-soft leading-[1.7]">
        {tab === 0 && (
          <div className="grid gap-1.5">
            <Row label="Kondisi" value={product.condition === 'NEW' ? 'Baru' : 'Bekas'} />
            <Row label="Berat Satuan" value={`${product.weight} g`} />
            <Row label="Min. Beli" value={`${product.minOrderQty} pcs`} />
            <Row
              label="Kategori"
              value={
                <Link href={`/kategori/${product.category.slug}`} className="text-primary font-semibold no-underline">
                  {product.category.name}
                </Link>
              }
            />
            <Row
              label="Etalase"
              value={
                <Link href={`/toko/${product.shop.slug}`} className="text-primary font-semibold no-underline">
                  Semua Etalase
                </Link>
              }
            />
            <div className="mt-2.5">
              <strong className="block mb-1 text-ink">{product.name}</strong>
              <span className="whitespace-pre-line">{shown}</span>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((x) => !x)}
                  className="block text-primary font-bold mt-1.5 ghost-btn"
                >
                  {expanded ? 'Tutup' : 'Lihat Selengkapnya'}
                </button>
              )}
            </div>
          </div>
        )}

        {tab === 1 && (
          <div className="grid gap-1.5">
            <Row label="Berat" value={`${product.weight} gram`} />
            <Row label="Min. Pembelian" value={`${product.minOrderQty} pcs`} />
            <Row label="Kondisi" value={product.condition === 'NEW' ? 'Baru' : 'Bekas'} />
            <Row label="Stok Tersedia" value={String(product.stock)} />
            {product.variants.length > 0 && (
              <Row
                label="Varian"
                value={product.variants.map((v) => v.name).join(' · ')}
              />
            )}
          </div>
        )}

        {tab === 2 && (
          <p className="m-0">
            Produk dijual oleh penjual UMKM lokal. Pastikan cek kelengkapan saat barang diterima dan simpan
            bukti pembelian. Jika ada masalah, hubungi penjual lewat tombol Chat — atau ajukan refund dari
            halaman pesanan setelah barang sampai.
          </p>
        )}

        {tab === 3 && <DiscussionThread productId={product.id} />}
      </div>
    </div>
  );
}
