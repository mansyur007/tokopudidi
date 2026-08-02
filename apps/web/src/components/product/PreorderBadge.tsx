// Pre-order (M15-B1) — murni informasi lead time, dipakai konsisten di card,
// detail, keranjang, dan checkout supaya janjinya sama di semua tempat.
export function PreorderBadge({ days, className = '' }: { days: number; className?: string }) {
  return (
    <span
      data-testid="preorder-badge"
      className={`inline-flex items-center gap-1 text-[10.5px] font-bold text-primary-700 bg-primary-50 rounded px-1.5 py-0.5 ${className}`}
    >
      📦 Pre-Order · {days} hari
    </span>
  );
}
