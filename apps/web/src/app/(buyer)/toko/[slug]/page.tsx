import { notFound } from 'next/navigation';
import { getShop } from '@/lib/api/shops';
import { listProducts } from '@/lib/api/products';
import { ApiClientError } from '@/lib/api/client';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { ShowcaseTabs } from '@/components/shop/ShowcaseTabs';

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
      <ShopHeader shop={shop} />
      <ShowcaseTabs shopSlug={shop.slug} showcases={shop.showcases} />

      <section className="wrap py-4">
        <h2 className="font-semibold mb-3">Semua Produk ({products.total})</h2>
        <ProductGrid
          items={products.items}
          emptyText="Toko ini belum punya produk."
        />
      </section>
    </div>
  );
}
