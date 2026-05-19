import { ProductCard } from './ProductCard';
import type { ProductCard as ProductCardType } from '@/lib/api/products';

interface Props {
  title: string;
  items: ProductCardType[];
  emptyText?: string;
}

export function HorizontalRow({ title, items, emptyText = 'Belum ada produk' }: Props) {
  return (
    <section className="px-4 py-6 max-w-5xl mx-auto">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyText}</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 snap-x snap-mandatory">
          {items.map((p) => (
            <div key={p.id} className="snap-start">
              <ProductCard product={p} variant="horizontal" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
