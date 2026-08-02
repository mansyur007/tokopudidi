import { prisma } from '@tokopudidi/database';
import {
  toProductCard,
  withFlashPrice,
  CARD_SHOP_SELECT,
  type ProductCard,
} from '../product/product.service';
import { runningWhere } from './flashSale.service';

// Sisi pembeli dari flash sale (M15-C1): event yang sedang berjalan, lengkap
// dengan kartu produknya. Terpisah dari `flashSale.service` supaya file itu
// bisa dipakai `product.service` tanpa lingkaran import.

export interface FlashSaleItemCard {
  id: string;
  salePrice: number;
  quota: number;
  soldCount: number;
  /** Sisa kuota; 0 = "Habis" di UI, dan checkout otomatis pakai harga normal. */
  remaining: number;
  product: ProductCard;
}

export interface RunningFlashSale {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  items: FlashSaleItemCard[];
}

/**
 * Event yang sedang berjalan, untuk section beranda & halaman `/flash-sale`.
 *
 * Kalau ada lebih dari satu yang berjalan bersamaan, yang ditampilkan adalah
 * yang paling cepat berakhir — satu section berarti satu hitungan mundur, dan
 * hitungan mundur yang benar adalah tenggat terdekat. Konsekuensinya event lain
 * baru muncul setelah yang ini tutup; itu diterima karena tumpang tindih antar
 * event memang dihalangi di sisi admin (per produk), jadi tidak ada produk yang
 * kehilangan harga flash-nya gara-gara ini — hanya urutan tampilnya yang
 * ditunda.
 */
export async function getRunningFlashSale(
  now: Date = new Date(),
): Promise<RunningFlashSale | null> {
  const event = await prisma.flashSale.findFirst({
    where: runningWhere(now),
    orderBy: { endAt: 'asc' },
    select: {
      id: true, name: true, startAt: true, endAt: true,
      items: {
        // Produk yang sudah tidak layak tampil (nonaktif, dihapus, stok habis)
        // tidak boleh ikut: kartunya akan menuju halaman yang tidak bisa dibeli.
        where: { product: { isActive: true, deletedAt: null, stock: { gt: 0 } } },
        orderBy: { salePrice: 'asc' },
        select: {
          id: true, salePrice: true, quota: true, soldCount: true,
          product: {
            include: {
              images: { orderBy: { order: 'asc' as const }, take: 1 },
              shop: { select: CARD_SHOP_SELECT },
            },
          },
        },
      },
    },
  });
  if (!event) return null;

  return {
    id: event.id,
    name: event.name,
    startAt: event.startAt,
    endAt: event.endAt,
    items: event.items.map((it) => {
      const card = toProductCard(it.product);
      const remaining = Math.max(0, it.quota - it.soldCount);
      return {
        id: it.id,
        salePrice: it.salePrice,
        quota: it.quota,
        soldCount: it.soldCount,
        remaining,
        // Kartunya dikirim dengan harga flash sudah terpasang. Kalau kuotanya
        // habis, harga kembali ke hasil `toProductCard` biasa — yang persis
        // sama dengan yang akan ditagih checkout.
        product: remaining > 0 ? withFlashPrice(card, it.salePrice) : card,
      };
    }),
  };
}
