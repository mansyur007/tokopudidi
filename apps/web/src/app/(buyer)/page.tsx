import { fetchCategories } from '@/lib/api/categories';
import { listProducts } from '@/lib/api/products';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { HeroCard } from '@/components/home/HeroCard';
import { ProductFeed } from '@/components/home/ProductFeed';

const FALLBACK = { items: [], total: 0, page: 1, limit: 30 };

// Halaman beranda — SSR, paralelkan semua fetch.
export default async function HomePage() {
  const [categories, forYou, mall, incaran] = await Promise.all([
    fetchCategories(),
    listProducts({ sort: 'bestseller', limit: 30 }).catch(() => FALLBACK),
    listProducts({ sort: 'rating', limit: 30 }).catch(() => FALLBACK),
    listProducts({ sort: 'newest', limit: 30 }).catch(() => FALLBACK),
  ]);

  return (
    <div className="wrap py-3 md:py-4 pb-10">
      <BannerCarousel />

      <div className="mt-5">
        <HeroCard categories={categories} />
      </div>

      <ProductFeed
        forYou={forYou.items}
        mall={mall.items}
        incaran={incaran.items}
      />
    </div>
  );
}
