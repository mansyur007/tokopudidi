import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getProduct, getRelated, listProducts } from '@/lib/api/products';
import { ApiClientError } from '@/lib/api/client';
import { formatRupiah } from '@tokopudidi/shared';
import { ProductGallery } from '@/components/product/ProductGallery';
import { InfoTabs } from '@/components/product/InfoTabs';
import { BuyBox } from '@/components/product/BuyBox';
import { ProductReviews } from '@/components/product/ProductReviews';
import { ProductCard } from '@/components/product/ProductCard';
import { ReportButton } from '@/components/report/ReportButton';
import { Icon } from '@/components/shell/Icon';

interface Props { params: { slug: string } }

export default async function ProductDetailPage({ params }: Props) {
  let product;
  try {
    product = await getProduct(params.slug);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) notFound();
    throw err;
  }

  // "Lainnya di toko ini" — produk lain dari toko yang sama.
  // "Pilihan lainnya untukmu" — pakai endpoint related yang sudah ada.
  const [moreFromShop, related] = await Promise.all([
    listProducts({ shopId: product.shop.id, limit: 6 })
      .then((r) => r.items.filter((p) => p.id !== product.id).slice(0, 6))
      .catch(() => []),
    getRelated(product.id).then((items) => items.slice(0, 6)).catch(() => []),
  ]);

  return (
    <div className="wrap py-3.5 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted mb-4 flex-wrap">
        <Link href="/" className="text-primary font-semibold no-underline">Home</Link>
        <Icon name="chevron-right" size={12} />
        <Link href={`/kategori/${product.category.slug}`} className="text-ink-muted no-underline hover:text-primary">
          {product.category.name}
        </Link>
        <Icon name="chevron-right" size={12} />
        <span className="text-ink truncate max-w-[40ch]">{product.name}</span>
      </div>

      {/* Main 3-col card (340 | 1fr | 280) — stack pada mobile */}
      <div className="bg-white border border-line rounded-card p-5 md:p-[22px]">
        <div className="grid gap-7 md:[grid-template-columns:340px_1fr_280px] items-start">
          {/* Kolom 1 — Gallery */}
          <div>
            <ProductGallery
              images={product.images.length > 0 ? product.images : (product.imageUrl ? [{ id: 'fallback', url: product.imageUrl }] : [])}
              alt={product.name}
            />
          </div>

          {/* Kolom 2 — Info */}
          <div className="flex flex-col gap-3.5 min-w-0">
            {product.shop.ktpVerified && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Icon name="shield" size={14} /> Official Store
              </div>
            )}
            <h1 className="text-[21px] font-bold leading-snug m-0 text-ink">{product.name}</h1>

            <div className="flex items-center gap-2 text-[12.5px] text-ink-muted flex-wrap">
              <span>Terjual {product.soldCount}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-0.5 text-star">
                <Icon name="star" size={13} />
                <span className="text-ink font-semibold ml-0.5">{product.ratingAvg.toFixed(1)}</span>
              </span>
              <span>({product.ratingCount} rating)</span>
              <span>•</span>
              <ReportButton targetType="PRODUCT" targetId={product.id} targetLabel={product.name} />
            </div>

            <div>
              <div className="text-[28px] font-extrabold tracking-tight text-ink leading-none">
                {formatRupiah(product.price)}
              </div>
              {!product.shop.isOpen && (
                <div className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded mt-2 inline-block">
                  Toko sedang tutup sementara.
                </div>
              )}
            </div>

            <div className="border-t border-line pt-3.5">
              <InfoTabs product={product} />
            </div>

            {/* Store card */}
            <div className="flex items-center gap-3 border border-line rounded-card p-3.5 mt-1">
              <div className="relative w-10 h-10 rounded-full bg-page overflow-hidden shrink-0 border border-line">
                {product.shop.logoUrl && (
                  <Image src={product.shop.logoUrl} alt={product.shop.name} fill sizes="40px" className="object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/toko/${product.shop.slug}`} className="flex items-center gap-1.5 font-bold text-sm text-ink no-underline">
                  <span className="truncate">{product.shop.name}</span>
                  {product.shop.ktpVerified && (
                    <span className="w-4 h-4 rounded-full bg-primary text-white grid place-items-center shrink-0">
                      <Icon name="check" size={10} stroke={3} />
                    </span>
                  )}
                </Link>
                <div className="text-[11.5px] text-ink-muted mt-0.5 inline-flex items-center gap-1">
                  <span className="inline-flex items-center gap-0.5 text-star">
                    <Icon name="star" size={11} />
                    <span className="text-ink font-semibold ml-0.5">{product.shop.ratingAvg.toFixed(1)}</span>
                  </span>
                  <span>·</span>
                  <span>{product.shop.totalSold}+ terjual</span>
                </div>
              </div>
              <Link
                href={`/toko/${product.shop.slug}`}
                className="bg-white border-[1.5px] border-primary text-primary px-4 py-1.5 rounded-md font-bold text-[13px] no-underline hover:bg-primary-50 shrink-0"
              >
                Kunjungi
              </Link>
            </div>

            {/* Shipping card */}
            <div className="border border-line rounded-card p-3.5 grid gap-2">
              <div className="font-bold text-[13px] text-ink">Pengiriman</div>
              <div className="flex items-center gap-2 text-[12.5px] text-ink-muted">
                <Icon name="pin" size={15} className="text-primary" />
                Dikirim dari <strong className="text-ink font-semibold">{product.shop.city}</strong>
              </div>
              <div className="flex items-center gap-2 text-[12.5px] text-ink-muted">
                <Icon name="truck" size={15} className="text-primary" />
                Estimasi tiba 2–3 hari · Bebas Ongkir tersedia
              </div>
            </div>
          </div>

          {/* Kolom 3 — Buy box */}
          <div>
            <BuyBox product={product} />
          </div>
        </div>
      </div>

      {/* Reviews */}
      <ProductReviews
        productId={product.id}
        ratingAvg={product.ratingAvg}
        ratingCount={product.ratingCount}
      />

      {/* Related */}
      {moreFromShop.length > 0 && (
        <section className="mt-7">
          <div className="flex items-center mb-3.5">
            <h2 className="text-lg font-extrabold m-0 text-ink">Lainnya di toko ini</h2>
            <Link
              href={`/toko/${product.shop.slug}`}
              className="ml-auto text-primary font-bold text-[13px] no-underline"
            >
              Lihat Semua
            </Link>
          </div>
          <div className="feed-grid">
            {moreFromShop.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-7">
          <div className="flex items-center mb-3.5">
            <h2 className="text-lg font-extrabold m-0 text-ink">Pilihan lainnya untukmu</h2>
            <Link
              href={`/kategori/${product.category.slug}`}
              className="ml-auto text-primary font-bold text-[13px] no-underline"
            >
              Lihat Semua
            </Link>
          </div>
          <div className="feed-grid">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
