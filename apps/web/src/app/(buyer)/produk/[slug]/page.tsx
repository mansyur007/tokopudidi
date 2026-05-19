import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getProduct, getRelated } from '@/lib/api/products';
import { ApiClientError } from '@/lib/api/client';
import { formatRupiah } from '@tokopudidi/shared';
import { ProductGallery } from '@/components/product/ProductGallery';
import { HorizontalRow } from '@/components/product/HorizontalRow';
import { AddToCartBar } from '@/components/product/AddToCartBar';
import { ProductReviews } from '@/components/product/ProductReviews';

interface Props { params: { slug: string } }

export default async function ProductDetailPage({ params }: Props) {
  let product;
  try {
    product = await getProduct(params.slug);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) notFound();
    throw err;
  }

  const related = await getRelated(product.id).catch(() => []);

  return (
    <div className="pb-32 md:pb-20">
      <ProductGallery images={product.images} alt={product.name} />

      {/* Info utama */}
      <section className="px-4 py-4 bg-white">
        <h1 className="text-xl font-semibold leading-tight">{product.name}</h1>
        <p className="text-2xl font-bold text-primary mt-1">{formatRupiah(product.price)}</p>
        <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
          <span>⭐ {product.ratingAvg.toFixed(1)} ({product.ratingCount} ulasan)</span>
          <span>•</span>
          <span>{product.soldCount} terjual</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Stok {product.stock} • Berat {product.weight}gr • {product.condition === 'NEW' ? 'Baru' : 'Bekas'}
        </p>
      </section>

      {/* Info toko */}
      <section className="mt-2 px-4 py-3 bg-white border-t border-b">
        <Link href={`/toko/${product.shop.slug}`} className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0">
            {product.shop.logoUrl && (
              <Image src={product.shop.logoUrl} alt={product.shop.name} fill sizes="48px" className="object-cover" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate flex items-center gap-1">
              {product.shop.name}
              {product.shop.ktpVerified && <span title="Terverifikasi" aria-label="Terverifikasi">✅</span>}
            </p>
            <p className="text-xs text-gray-500 truncate">
              📍 {product.shop.city} · ⭐ {product.shop.ratingAvg.toFixed(1)}
            </p>
          </div>
          <span className="text-primary text-sm">Kunjungi →</span>
        </Link>
        {!product.shop.isOpen && (
          <p className="text-xs text-orange-700 bg-orange-50 mt-2 px-2 py-1 rounded">
            Toko sedang tutup sementara.
          </p>
        )}
      </section>

      {/* Tabs (sederhana — section saja) */}
      <section className="mt-2 px-4 py-4 bg-white">
        <h2 className="font-semibold mb-2">Deskripsi Produk</h2>
        <p className="text-sm whitespace-pre-line text-gray-700">{product.description}</p>
      </section>

      <ProductReviews
        productId={product.id}
        ratingAvg={product.ratingAvg}
        ratingCount={product.ratingCount}
      />

      <HorizontalRow title="Produk Lain dari Toko Ini" items={related} />

      <AddToCartBar product={product} />
    </div>
  );
}
