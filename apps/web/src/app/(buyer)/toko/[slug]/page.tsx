import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getShop } from '@/lib/api/shops';
import { listProducts } from '@/lib/api/products';
import { ApiClientError } from '@/lib/api/client';
import { formatTanggal } from '@tokopudidi/shared';
import { ProductGrid } from '@/components/product/ProductGrid';

interface Props { params: { slug: string } }

export default async function TokoDetailPage({ params }: Props) {
  let shop;
  try {
    shop = await getShop(params.slug);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) notFound();
    throw err;
  }

  const products = await listProducts({ shopId: shop.id, sort: 'bestseller', limit: 24 })
    .catch(() => ({ items: [], total: 0, page: 1, limit: 24 }));

  return (
    <div>
      {/* Banner toko */}
      <div className="relative aspect-[4/1] bg-gray-100">
        {shop.bannerUrl && (
          <Image src={shop.bannerUrl} alt="" fill priority sizes="100vw" className="object-cover" />
        )}
      </div>

      <section className="px-4 py-4 bg-white border-b">
        <div className="flex items-start gap-3 max-w-5xl mx-auto">
          <div className="relative w-16 h-16 rounded-full bg-gray-100 overflow-hidden shrink-0 -mt-10 ring-4 ring-white">
            {shop.logoUrl && (
              <Image src={shop.logoUrl} alt={shop.name} fill sizes="64px" className="object-cover" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold flex items-center gap-1">
              {shop.name}
              {shop.ktpVerified && <span title="Terverifikasi" aria-label="Terverifikasi">✅</span>}
            </h1>
            <p className="text-xs text-gray-500">📍 {shop.city}{shop.province ? `, ${shop.province}` : ''}</p>
            <p className="text-xs text-gray-500">Bergabung sejak {formatTanggal(shop.joinedAt)}</p>
            <div className="flex gap-3 text-sm mt-2 text-gray-700">
              <span>⭐ {shop.ratingAvg.toFixed(1)} ({shop.ratingCount})</span>
              <span>•</span>
              <span>{shop.totalSold} terjual</span>
            </div>
          </div>
        </div>
        {shop.description && (
          <p className="text-sm text-gray-700 mt-3 max-w-5xl mx-auto">{shop.description}</p>
        )}
        {!shop.isOpen && (
          <p className="mt-3 text-sm bg-orange-50 text-orange-700 px-3 py-2 rounded">
            Toko sedang tutup{shop.closedReason ? ` — ${shop.closedReason}` : ''}.
          </p>
        )}
      </section>

      <section className="px-4 py-4 max-w-5xl mx-auto">
        <h2 className="font-semibold mb-3">Semua Produk ({products.total})</h2>
        <ProductGrid
          items={products.items}
          emptyText="Toko ini belum punya produk."
        />
      </section>
    </div>
  );
}
