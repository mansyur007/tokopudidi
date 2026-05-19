import { ProductCard } from './ProductCard';
import type { ProductCard as ProductCardType } from '@/lib/api/products';

interface Props {
  items: ProductCardType[];
  emptyText?: string;
  emptyCta?: { href: string; label: string };
}

export function ProductGrid({ items, emptyText = 'Belum ada produk', emptyCta }: Props) {
  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-600 mb-3">{emptyText}</p>
        {emptyCta && (
          <a href={emptyCta.href} className="btn-primary inline-flex">{emptyCta.label}</a>
        )}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
