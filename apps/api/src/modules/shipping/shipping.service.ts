// Mock shipping: tarif flat per zona berdasarkan provinsi tujuan.
// Adapter pattern — siap diganti dengan API JNE/J&T/SiCepat di production.

export type ShippingMethod = 'REGULAR' | 'SAME_DAY' | 'PICKUP_SENDIRI';
export type Zone = 'JABODETABEK' | 'JAWA' | 'LUAR_JAWA';

const JABODETABEK = ['DKI Jakarta', 'Jawa Barat', 'Banten'];
const JAWA = ['Jawa Tengah', 'Jawa Timur', 'DI Yogyakarta'];

function detectZone(province: string): Zone {
  if (JABODETABEK.includes(province)) return 'JABODETABEK';
  if (JAWA.includes(province)) return 'JAWA';
  return 'LUAR_JAWA';
}

interface TarifEntry {
  REGULAR: number;
  SAME_DAY: number | null; // null = tidak tersedia
}

const TARIF: Record<Zone, TarifEntry> = {
  JABODETABEK: { REGULAR:  9000, SAME_DAY: 18000 },
  JAWA:        { REGULAR: 14000, SAME_DAY: null  },
  LUAR_JAWA:   { REGULAR: 25000, SAME_DAY: null  },
};

export function isSameDayAvailable(buyerProvince: string): boolean {
  return detectZone(buyerProvince) === 'JABODETABEK';
}

export function isCodAvailable(buyerProvince: string): boolean {
  // COD hanya Jabodetabek untuk demo.
  return detectZone(buyerProvince) === 'JABODETABEK';
}

export function quoteShipping(
  buyerProvince: string,
  method: ShippingMethod,
  totalWeightGr: number,
): number {
  if (method === 'PICKUP_SENDIRI') return 0;

  const zone = detectZone(buyerProvince);
  const baseTarif = TARIF[zone][method];
  if (baseTarif === null) {
    throw new Error(`Pengiriman ${method} tidak tersedia ke ${buyerProvince}`);
  }

  // Tarif per kg, minimum 1kg.
  const kg = Math.max(1, Math.ceil(totalWeightGr / 1000));
  return baseTarif * kg;
}

// Mock tracking — generate 4 tahap dummy berdasarkan timestamp.
export function mockTracking(trackingNumber: string, shippedAt: Date) {
  const stages = [
    { status: 'Pesanan diterima kurir',       offsetHr:  0 },
    { status: 'Dalam perjalanan ke kota tujuan', offsetHr: 6 },
    { status: 'Tiba di gudang kota tujuan',     offsetHr: 18 },
    { status: 'Diantar oleh kurir',             offsetHr: 30 },
  ];
  const now = Date.now();
  return stages.map((s) => {
    const t = shippedAt.getTime() + s.offsetHr * 3600 * 1000;
    return {
      status: s.status,
      timestamp: new Date(t).toISOString(),
      reached: now >= t,
    };
  });
}
