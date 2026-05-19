import Link from 'next/link';
import { fetchCategories } from '@/lib/api/categories';

export default async function KategoriListPage() {
  const categories = await fetchCategories();

  return (
    <div className="px-4 py-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Semua Kategori</h1>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/kategori/${cat.slug}`}
            className="card flex flex-col items-center justify-center py-4 px-2 text-center hover:border-primary"
          >
            <div className="w-12 h-12 rounded-full bg-primary-50 mb-2 flex items-center justify-center text-xl" aria-hidden>
              🛍️
            </div>
            <span className="text-xs leading-tight text-gray-700">{cat.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
