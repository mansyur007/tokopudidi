'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah, type ScrapeResult, type ScrapedProduct } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { scrapeTokopedia } from '@/lib/api/scraper';
import { ApiClientError } from '@/lib/api/client';

// Field yang selaras productCreateSchema — inilah yang dipakai saat impor ke Tokopudidi.
function toImportShape(p: ScrapedProduct) {
  return {
    name: p.name,
    description: p.description,
    price: p.price,
    stock: p.stock,
    minOrderQty: p.minOrderQty,
    weight: p.weight,
    condition: p.condition,
    imageUrls: p.imageUrls,
    ...(p.variants?.length ? { variants: p.variants } : {}),
  };
}

function downloadJson(result: ScrapeResult) {
  const payload = {
    _meta: result.meta,
    shop: result.shop,
    // Array siap-impor: hanya field yang dikenali form produk Tokopudidi.
    products: result.products.map(toImportShape),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tokopudidi-import-${result.shop.slug}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ScrapPage() {
  const router = useRouter();
  const { user, tokens } = useAuthStore();

  const [url, setUrl] = useState('');
  const [maxProducts, setMaxProducts] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  // --- Guard admin (mirror pola AdminShell) ---
  if (!user) {
    if (typeof window !== 'undefined') router.push('/masuk');
    return null;
  }
  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-6 max-w-md text-center">
          <h2 className="text-lg font-semibold mb-2">Khusus Admin</h2>
          <p className="text-sm text-gray-600 mb-4">
            Halaman scraper hanya untuk admin Tokopudidi.
          </p>
          <Link href="/" className="btn-primary inline-flex">Kembali ke Beranda</Link>
        </div>
      </div>
    );
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!tokens?.accessToken) return;
    if (!url.trim()) { setError('Masukkan URL toko/produk Tokopedia dulu'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await scrapeTokopedia(url.trim(), maxProducts, tokens.accessToken);
      setResult(res);
      if (res.products.length === 0) setError('Tidak ada produk yang berhasil diambil. Lihat catatan di bawah.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal menjalankan scraper. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-1">
        <h1 className="text-xl font-bold">🔎 Scraper Tokopedia</h1>
        <Link href="/admin" className="text-sm text-primary hover:underline">← Panel Admin</Link>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Ambil data produk dari halaman toko Tokopedia (mis. <code>https://www.tokopedia.com/xiaomi</code>)
        atau satu URL produk. Hasilnya bisa diunduh dalam format yang selaras dengan form produk Tokopudidi.
      </p>

      {/* Form */}
      <form onSubmit={run} className="card p-4 md:p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">URL Tokopedia</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.tokopedia.com/xiaomi"
            className="w-full border border-line rounded-lg px-3 py-2 text-sm"
            disabled={loading}
          />
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Maks. produk</label>
            <input
              type="number"
              min={1}
              max={40}
              value={maxProducts}
              onChange={(e) => setMaxProducts(Math.min(40, Math.max(1, Number(e.target.value) || 1)))}
              className="w-24 border border-line rounded-lg px-3 py-2 text-sm"
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Mengambil…' : 'Mulai Scrape'}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Catatan: proses menjalankan browser asli dan mengunjungi tiap halaman produk, jadi bisa memakan
          waktu puluhan detik. Tokopedia punya proteksi anti-bot — bila diblokir, coba lagi nanti atau
          kecilkan jumlah produk.
        </p>
      </form>

      {loading && (
        <div className="mt-6 text-center text-sm text-gray-500">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mb-2" />
          <p>Sedang scraping… jangan tutup halaman ini.</p>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="font-semibold">{result.shop.name ?? result.shop.slug}</p>
              <p className="text-xs text-gray-500">
                {result.meta.productCount} produk · diambil {new Date(result.meta.scrapedAt).toLocaleString('id-ID')}
              </p>
            </div>
            {result.products.length > 0 && (
              <button onClick={() => downloadJson(result)} className="btn-primary">
                ⬇ Download JSON (siap impor)
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {result.products.map((p) => (
              <a
                key={p.sourceUrl}
                href={p.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="card overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-square bg-gray-100">
                  {p.imageUrls[0] && (
                    <Image
                      src={p.imageUrls[0]}
                      alt={p.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs line-clamp-2 min-h-[2rem]">{p.name}</p>
                  <p className="text-sm font-semibold text-primary mt-1">{formatRupiah(p.price)}</p>
                  {p.ratingAvg != null && (
                    <p className="text-[11px] text-gray-500">⭐ {p.ratingAvg}</p>
                  )}
                  {p.categoryHint && (
                    <p className="text-[11px] text-gray-400 truncate">{p.categoryHint}</p>
                  )}
                </div>
              </a>
            ))}
          </div>

          {result.meta.warnings.length > 0 && (
            <details className="mt-5 text-sm">
              <summary className="cursor-pointer text-gray-600">
                {result.meta.warnings.length} catatan / produk dilewati
              </summary>
              <ul className="mt-2 list-disc list-inside text-xs text-gray-500 space-y-1">
                {result.meta.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
