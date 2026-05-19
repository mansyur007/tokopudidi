import Link from 'next/link';
import { fetchCategories } from '@/lib/api/categories';
import { listProducts } from '@/lib/api/products';
import { fetchBanners } from '@/lib/api/banners';
import { fetchFeaturedShops } from '@/lib/api/shops';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { FeaturedShops } from '@/components/home/FeaturedShops';
import { HorizontalRow } from '@/components/product/HorizontalRow';

// Halaman beranda — SSR, paralelkan semua fetch.
export default async function HomePage() {
  const [categories, banners, featuredShops, popular, latest] = await Promise.all([
    fetchCategories(),
    fetchBanners('HOME_TOP'),
    fetchFeaturedShops(),
    listProducts({ sort: 'bestseller', limit: 10 }).catch(() => ({ items: [], total: 0, page: 1, limit: 10 })),
    listProducts({ sort: 'newest', limit: 10 }).catch(() => ({ items: [], total: 0, page: 1, limit: 10 })),
  ]);

  return (
    <div>
      <BannerCarousel banners={banners} />

      {/* Quick categories — grid 4×2 */}
      <section className="px-4 py-6 max-w-5xl mx-auto">
        <h2 className="text-lg font-semibold mb-3">Kategori</h2>
        <div className="grid grid-cols-4 gap-3">
          {categories.slice(0, 8).map((cat) => (
            <Link
              key={cat.id}
              href={`/kategori/${cat.slug}`}
              className="card flex flex-col items-center justify-center py-4 px-2 text-center hover:border-primary transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary-50 mb-2 flex items-center justify-center text-lg" aria-hidden>
                🛍️
              </div>
              <span className="text-xs text-gray-700 leading-tight">{cat.name}</span>
            </Link>
          ))}
        </div>
        <div className="mt-3 text-center">
          <Link href="/kategori" className="text-sm text-primary hover:underline">
            Lihat semua kategori →
          </Link>
        </div>
      </section>

      <HorizontalRow
        title="Lagi Rame 🔥"
        items={popular.items}
        emptyText="Belum ada produk laris minggu ini"
      />

      <FeaturedShops shops={featuredShops} />

      <HorizontalRow
        title="Khusus Buat Kamu"
        items={latest.items}
        emptyText="Belum ada produk baru"
      />
    </div>
  );
}
