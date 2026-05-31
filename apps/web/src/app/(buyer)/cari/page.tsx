import Link from 'next/link';
import { listProducts, type ProductListParams } from '@/lib/api/products';
import { ProductGrid } from '@/components/product/ProductGrid';
import { SortBar } from './SortBar';

const SORT_LABELS: Record<NonNullable<ProductListParams['sort']>, string> = {
  relevance: 'Paling Sesuai',
  bestseller: 'Terlaris',
  cheapest: 'Termurah',
  expensive: 'Termahal',
  newest: 'Terbaru',
  rating: 'Rating Tertinggi',
};

interface PageProps {
  searchParams: {
    q?: string;
    sort?: ProductListParams['sort'];
    minPrice?: string;
    maxPrice?: string;
    minRating?: string;
    condition?: 'NEW' | 'USED';
    page?: string;
  };
}

export default async function CariPage({ searchParams }: PageProps) {
  const q = searchParams.q?.trim() ?? '';
  const sort = searchParams.sort ?? 'relevance';
  const page = Number(searchParams.page ?? '1');

  const params: ProductListParams = {
    q: q || undefined,
    sort,
    page,
    limit: 20,
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    minRating: searchParams.minRating ? Number(searchParams.minRating) : undefined,
    condition: searchParams.condition,
  };

  const result = await listProducts(params).catch(() => ({
    items: [], total: 0, page: 1, limit: 20,
  }));

  const totalPages = Math.max(1, Math.ceil(result.total / result.limit));

  return (
    <div className="wrap py-4">
      <header className="mb-3">
        {q ? (
          <h1 className="text-lg">
            Hasil untuk <span className="font-semibold">&ldquo;{q}&rdquo;</span>
          </h1>
        ) : (
          <h1 className="text-lg font-semibold">Semua Produk</h1>
        )}
        <p className="text-sm text-gray-500">{result.total} produk ditemukan</p>
      </header>

      <SortBar currentSort={sort} labels={SORT_LABELS} />

      <div className="mt-4">
        <ProductGrid
          items={result.items}
          emptyText={
            q
              ? `Yah, tidak ada produk yang cocok dengan "${q}". Coba kata kunci lain ya.`
              : 'Belum ada produk yang sesuai filter.'
          }
          emptyCta={{ href: '/', label: 'Lihat semua produk' }}
        />
      </div>

      {/* Pagination — sederhana */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2 text-sm" aria-label="Pagination">
          {page > 1 && (
            <Link
              href={{ pathname: '/cari', query: { ...searchParams, page: page - 1 } }}
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
              href={{ pathname: '/cari', query: { ...searchParams, page: page + 1 } }}
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
