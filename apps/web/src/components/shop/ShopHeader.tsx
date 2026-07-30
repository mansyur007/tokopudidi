import { SmartImage } from '@/components/media/SmartImage';
import { formatTanggal } from '@tokopudidi/shared';
import { ReportButton } from '@/components/report/ReportButton';
import type { ShopDetail } from '@/lib/api/shops';

/**
 * Banner + identitas toko. Dipakai halaman toko dan halaman etalase (M11-B1)
 * supaya keduanya tidak menyimpan salinan markup yang sama.
 */
export function ShopHeader({ shop }: { shop: ShopDetail }) {
  return (
    <>
      <div className="relative aspect-[4/1] bg-gray-100">
        {shop.bannerUrl && (
          <SmartImage src={shop.bannerUrl} alt="" fill priority sizes="100vw" className="object-cover" />
        )}
      </div>

      <section className="px-4 py-4 bg-white border-b">
        <div className="wrap flex items-start gap-3">
          <div className="relative w-16 h-16 rounded-full bg-gray-100 overflow-hidden shrink-0 -mt-10 ring-4 ring-white">
            {shop.logoUrl && (
              <SmartImage src={shop.logoUrl} alt={shop.name} fill sizes="64px" className="object-cover" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold flex items-center gap-1">
              {shop.name}
              {shop.ktpVerified && <span title="Terverifikasi" aria-label="Terverifikasi">✅</span>}
            </h1>
            <p className="text-xs text-gray-500">📍 {shop.city}{shop.province ? `, ${shop.province}` : ''}</p>
            <p className="text-xs text-gray-500">Bergabung sejak {formatTanggal(shop.joinedAt)}</p>
            <div className="flex gap-3 text-sm mt-2 text-gray-700">
              <span>⭐ {shop.ratingAvg.toFixed(1)} ({shop.ratingCount})</span>
              <span>•</span>
              <span>{shop.totalSold} terjual</span>
            </div>
          </div>
          <ReportButton targetType="SHOP" targetId={shop.id} targetLabel={shop.name} />
        </div>
        {shop.description && (
          <p className="wrap text-sm text-ink-soft mt-3">{shop.description}</p>
        )}
        {!shop.isOpen && (
          <p className="mt-3 text-sm bg-orange-50 text-orange-700 px-3 py-2 rounded">
            Toko sedang tutup{shop.closedReason ? ` — ${shop.closedReason}` : ''}.
          </p>
        )}
      </section>
    </>
  );
}
