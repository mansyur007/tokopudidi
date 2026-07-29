import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getShop, getShopShowcase } from '@/lib/api/shops';
import { ApiClientError } from '@/lib/api/client';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { ShowcaseTabs } from '@/components/shop/ShowcaseTabs';

interface Props {
  params: { slug: string; showcaseSlug: string };
  searchParams: { page?: string };
}

export default async function TokoEtalasePage({ params, searchParams }: Props) {
  const page = Math.max(1, Number(searchParams.page) || 1);

  let shop;
  let data;
  try {
    [shop, data] = await Promise.all([
      getShop(params.slug),
      getShopShowcase(params.slug, params.showcaseSlug, { page, limit: 24 }),
    ]);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) notFound();
    throw err;
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div>
      <ShopHeader shop={shop} />
      <ShowcaseTabs
        shopSlug={shop.slug}
        showcases={shop.showcases}
        activeSlug={params.showcaseSlug}
      />

      <section className="wrap py-4">
        <h2 className="font-semibold mb-3">{data.showcase.name} ({data.total})</h2>
        <ProductGrid
          items={data.items}
          emptyText="Etalase ini belum punya produk yang tersedia."
        />

        {totalPages > 1 && (
          <nav aria-label="Halaman" className="flex items-center justify-center gap-3 pt-6 text-sm">
            {page > 1 ? (
              <Link
                href={`/toko/${shop.slug}/etalase/${params.showcaseSlug}?page=${page - 1}`}
                className="btn-outline px-3 py-1"
              >
                ← Sebelumnya
              </Link>
            ) : (
              <span className="px-3 py-1 text-gray-300">← Sebelumnya</span>
            )}
            <span className="text-gray-500">Halaman {page} dari {totalPages}</span>
            {page < totalPages ? (
              <Link
                href={`/toko/${shop.slug}/etalase/${params.showcaseSlug}?page=${page + 1}`}
                className="btn-outline px-3 py-1"
              >
                Berikutnya →
              </Link>
            ) : (
              <span className="px-3 py-1 text-gray-300">Berikutnya →</span>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
