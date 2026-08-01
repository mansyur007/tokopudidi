import { getShopBadgeMeta, type ShopBadge } from '@tokopudidi/shared';

/**
 * Penanda reputasi toko (M14-B1). Satu komponen untuk semua tempat badge muncul
 * — kartu produk, header toko, halaman produk — supaya ikon dan penjelasannya
 * tidak berbeda antar halaman.
 *
 * Badge dihitung di API; komponen ini hanya menggambar. `title` selalu terisi
 * dari helper yang sama: badge tanpa keterangan cuma hiasan yang membuat
 * pembeli menebak-nebak artinya.
 */
export function ShopBadgeMark({
  badge,
  showLabel = false,
  className = '',
}: {
  badge: ShopBadge | null | undefined;
  /** Tampilkan nama badge, bukan ikon saja. Untuk tempat yang ruangnya cukup. */
  showLabel?: boolean;
  className?: string;
}) {
  const meta = getShopBadgeMeta(badge);
  if (!meta) return null;

  const official = badge === 'OFFICIAL';

  return (
    <span
      data-testid="shop-badge"
      data-badge={badge}
      title={meta.description}
      // Ikonnya sudah bermakna lewat title, tapi pembaca layar butuh teksnya
      // utuh — ikon emoji sendirian dibaca sebagai nama emoji, bukan artinya.
      aria-label={`${meta.label} — ${meta.description}`}
      className={[
        'inline-flex items-center gap-1 shrink-0 align-middle',
        showLabel ? 'text-[11px] font-semibold px-1.5 py-0.5 rounded' : 'text-xs',
        showLabel && (official ? 'bg-primary-100 text-primary' : 'bg-amber-100 text-amber-800'),
        className,
      ].filter(Boolean).join(' ')}
    >
      <span aria-hidden>{meta.icon}</span>
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}
