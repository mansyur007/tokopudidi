import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchCategories } from '@/lib/api/categories';
import { listProducts, type ProductListParams } from '@/lib/api/products';
import { ProductGrid } from '@/components/product/ProductGrid';

interface Props {
  params: { slug: string };
  searchParams: { sort?: ProductListParams['sort']; page?: string };
}

export default async function KategoriDetailPage({ params, searchParams }: Props) {
  const categories = await fetchCategories();
  const cat = categories.find((c) => c.slug === params.slug);
  if (!cat) notFound();

  const sort = searchParams.sort ?? 'bestseller';
  const page = Number(searchParams.page ?? '1');

  const result = await listProducts({
    categorySlug: params.slug,
    sort,
    page,
    limit: 20,
  }).catch(() => ({ items: [], total: 0, page: 1, limit: 20 }));

  const totalPages = Math.max(1, Math.ceil(result.total / result.limit));

  return (
    <div className="wrap py-4">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Kategori: {cat.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{result.total} produk</p>
      </header>

      <ProductGrid
        items={result.items}
        emptyText="Belum ada produk di kategori ini, coba cek lagi nanti ya."
      />

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link
              href={{ pathname: `/kategori/${params.slug}`, query: { ...searchParams, page: page - 1 } }}
              className="btn-outline"
            >
              ← Sebelumnya
            </Link>
          )}
          <span className="px-3 py-2 text-gray-600">
            Halaman {page} dari {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={{ pathname: `/kategori/${params.slug}`, query: { ...searchParams, page: page + 1 } }}
              className="btn-outline"
            >
              Selanjutnya →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
