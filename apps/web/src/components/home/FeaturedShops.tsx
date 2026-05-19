import Link from 'next/link';
import Image from 'next/image';
import type { ShopCard } from '@/lib/api/shops';

interface Props { shops: ShopCard[] }

export function FeaturedShops({ shops }: Props) {
  if (shops.length === 0) return null;
  return (
    <section className="px-4 py-6 max-w-5xl mx-auto">
      <h2 className="text-lg font-semibold mb-3">Toko UMKM Pilihan</h2>
      <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 snap-x snap-mandatory">
        {shops.map((s) => (
          <Link
            key={s.id}
            href={`/toko/${s.slug}`}
            className="card w-44 shrink-0 snap-start p-3 hover:border-primary transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="relative w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0">
                {s.logoUrl && (
                  <Image src={s.logoUrl} alt={s.name} fill sizes="40px" className="object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                <p className="text-xs text-gray-500 truncate">📍 {s.city}</p>
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-2 flex justify-between">
              <span>⭐ {s.ratingAvg.toFixed(1)}</span>
              <span>{s.totalSold} terjual</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
