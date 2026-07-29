// Statistik per-produk untuk seller (M11-B4).
//
// Batas data yang perlu diketahui pembaca kode ini:
//
// 1. `ProductView` di-UPSERT per (viewer, produk) — `viewedAt` ditimpa setiap
//    kali produk dilihat lagi. Jadi agregasi per hari di sini berarti
//    "penonton unik yang TERAKHIR melihat produk pada hari itu", bukan jumlah
//    pageview historis. Counter pageview sesungguhnya ada di `Product.viewCount`
//    (kumulatif sejak awal, tidak bisa dipecah per hari).
// 2. `CartItem` dihapus saat checkout (order.service), jadi tidak ada jejak
//    add-to-cart historis — metrik ATC sengaja tidak disediakan daripada
//    menampilkan angka yang menyesatkan.
import { prisma, Prisma, type OrderStatus } from '@tokopudidi/database';

// Status order yang dianggap menghasilkan uang. Sama persis dengan yang dipakai
// weekRevenue di seller.dashboard.routes supaya angka antar-halaman tidak beda.
export const REVENUE_STATUSES: OrderStatus[] = [
  'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED',
];

/**
 * Kunci hari `YYYY-MM-DD` dari komponen tanggal LOKAL server.
 *
 * Sengaja tidak memakai `toISOString().slice(0,10)`: itu mengonversi ke UTC,
 * sehingga batas hari bergeser kalau timezone server bukan UTC dan chart jadi
 * salah kolom. Yang penting di sini adalah konsisten — kunci deret hari dan
 * kunci baris data dibuat oleh fungsi yang sama.
 */
export function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Deret `days` kunci hari berurutan yang berakhir hari ini (inklusif). */
export function buildDayKeys(days: number, now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

/**
 * Hitung jumlah per hari. Hari tanpa data tetap muncul bernilai 0 supaya chart
 * tidak bolong (garisnya menyambung, bukan melompati tanggal).
 */
export function bucketByDay(keys: string[], dates: Date[]): { date: string; count: number }[] {
  const counts = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const d of dates) {
    const k = dayKey(d);
    // Baris di luar rentang diabaikan — bukan error.
    if (counts.has(k)) counts.set(k, counts.get(k)! + 1);
  }
  return keys.map((date) => ({ date, count: counts.get(date)! }));
}

/**
 * Konversi = pembeli unik ÷ penonton unik, dalam persen (1 desimal).
 *
 * `null` kalau belum ada penonton sama sekali — tanpa ini hasilnya NaN/Infinity
 * dan tampil sebagai "NaN%" di UI.
 *
 * Bisa melebihi 100%: pembeli yang melihat produk sebelum rentang ini (atau
 * membeli tanpa membuka halaman produk) tetap terhitung sebagai pembeli, tapi
 * tidak sebagai penonton. Itu bukan bug — angkanya memang perkiraan.
 */
export function conversionPct(buyers: number, viewers: number): number | null {
  if (viewers <= 0) return null;
  return Math.round((buyers / viewers) * 1000) / 10;
}

export function parseRange(input: unknown): { key: '7d' | '30d'; days: number } {
  return String(input) === '30d' ? { key: '30d', days: 30 } : { key: '7d', days: 7 };
}

export interface ProductStats {
  product: {
    id: string; name: string; slug: string;
    viewCount: number; soldCount: number; stock: number; isActive: boolean;
  };
  range: '7d' | '30d';
  chart: { date: string; count: number }[];
  totals: {
    viewersInRange: number;
    buyersInRange: number;
    orderCount: number;
    qtySold: number;
    revenue: number;
    conversionPct: number | null;
  };
  recentOrders: {
    orderId: string; orderNumber: string; status: string; createdAt: Date;
    quantity: number; subtotal: number; buyerName: string;
  }[];
}

/**
 * Kembalikan `null` kalau produk bukan milik toko ini (atau tidak ada) — route
 * yang menerjemahkannya jadi 404, supaya seller tidak bisa mengintip performa
 * produk toko lain lewat tebak-tebak id.
 */
export async function getProductStats(
  shopId: string,
  productId: string,
  rangeInput: unknown,
  now: Date = new Date(),
): Promise<ProductStats | null> {
  const range = parseRange(rangeInput);

  const product = await prisma.product.findFirst({
    where: { id: productId, shopId, deletedAt: null },
    select: { id: true, name: true, slug: true, viewCount: true, soldCount: true, stock: true, isActive: true },
  });
  if (!product) return null;

  const keys = buildDayKeys(range.days, now);
  // Awal hari pertama dalam rentang, mengikuti hari lokal (sama dengan dayKey).
  const from = new Date(now);
  from.setDate(from.getDate() - (range.days - 1));
  from.setHours(0, 0, 0, 0);

  const orderWhere: Prisma.OrderItemWhereInput = {
    productId,
    order: { shopId, status: { in: REVENUE_STATUSES }, createdAt: { gte: from } },
  };

  const [views, orderItems, recentRows] = await Promise.all([
    prisma.productView.findMany({
      where: { productId, viewedAt: { gte: from } },
      select: { viewedAt: true },
    }),
    prisma.orderItem.findMany({
      where: orderWhere,
      select: { quantity: true, subtotal: true, order: { select: { id: true, buyerId: true } } },
    }),
    prisma.orderItem.findMany({
      where: { productId, order: { shopId } },
      orderBy: { order: { createdAt: 'desc' } },
      take: 10,
      select: {
        quantity: true, subtotal: true,
        order: {
          select: {
            id: true, orderNumber: true, status: true, createdAt: true,
            buyer: { select: { fullName: true } },
          },
        },
      },
    }),
  ]);

  const viewersInRange = views.length;
  const buyersInRange = new Set(orderItems.map((it) => it.order.buyerId)).size;
  const orderCount = new Set(orderItems.map((it) => it.order.id)).size;

  return {
    product,
    range: range.key,
    chart: bucketByDay(keys, views.map((v) => v.viewedAt)),
    totals: {
      viewersInRange,
      buyersInRange,
      orderCount,
      qtySold: orderItems.reduce((sum, it) => sum + it.quantity, 0),
      revenue: orderItems.reduce((sum, it) => sum + it.subtotal, 0),
      conversionPct: conversionPct(buyersInRange, viewersInRange),
    },
    recentOrders: recentRows.map((r) => ({
      orderId: r.order.id,
      orderNumber: r.order.orderNumber,
      status: r.order.status,
      createdAt: r.order.createdAt,
      quantity: r.quantity,
      subtotal: r.subtotal,
      buyerName: r.order.buyer.fullName,
    })),
  };
}
