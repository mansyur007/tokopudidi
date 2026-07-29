import Link from 'next/link';
import { clsx } from 'clsx';
import type { ShopShowcaseSummary } from '@/lib/api/shops';

interface Props {
  shopSlug: string;
  showcases: ShopShowcaseSummary[];
  /** slug etalase yang sedang dibuka; undefined = tab "Semua Produk" */
  activeSlug?: string;
}

/**
 * Tab etalase di halaman toko (M11-B1). Server component — tab hanya navigasi
 * antar-URL, jadi tidak perlu state client.
 */
export function ShowcaseTabs({ shopSlug, showcases, activeSlug }: Props) {
  if (showcases.length === 0) return null;

  const tabClass = (active: boolean) =>
    clsx(
      'shrink-0 px-3 py-2 text-sm rounded-full border whitespace-nowrap',
      active
        ? 'bg-primary text-white border-primary font-medium'
        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
    );

  return (
    <nav aria-label="Etalase toko" className="border-b bg-white">
      <div className="wrap flex gap-2 overflow-x-auto py-2">
        <Link href={`/toko/${shopSlug}`} className={tabClass(!activeSlug)}>
          Semua Produk
        </Link>
        {showcases.map((s) => (
          <Link
            key={s.id}
            href={`/toko/${shopSlug}/etalase/${s.slug}`}
            className={tabClass(activeSlug === s.slug)}
          >
            {s.name}
            <span className={clsx('ml-1', activeSlug === s.slug ? 'text-white/80' : 'text-gray-400')}>
              {s.productCount}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
