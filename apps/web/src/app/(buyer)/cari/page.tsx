import Link from 'next/link';
import { listProducts, listProductCities, type ProductListParams } from '@/lib/api/products';
import { ProductGrid } from '@/components/product/ProductGrid';
import { SortBar } from './SortBar';
import { FilterSidebar } from './FilterSidebar';

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
    cities?: string;
    officialStoreOnly?: string;
    freeShipping?: string;
    cod?: string;
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
    cities: searchParams.cities || undefined,
    // Kirim hanya kalau aktif — filter boolean ini bukan tri-state.
    officialStoreOnly: searchParams.officialStoreOnly ? true : undefined,
    freeShipping: searchParams.freeShipping ? true : undefined,
    cod: searchParams.cod ? true : undefined,
  };

  const [result, cities] = await Promise.all([
    listProducts(params).catch(() => ({ items: [], total: 0, page: 1, limit: 20 })),
    listProductCities().catch(() => []),
  ]);

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

      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Sidebar filter — sticky di desktop, menumpuk di atas hasil pada mobile. */}
        <aside className="w-full md:w-60 md:shrink-0 md:sticky md:top-4">
          <FilterSidebar cities={cities} totalHasil={result.total} />
        </aside>

        <div className="flex-1 min-w-0">
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
      </div>
    </div>
  );
}
