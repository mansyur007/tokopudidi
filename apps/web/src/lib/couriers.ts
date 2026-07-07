// Daftar kurir + pola URL pelacakan (mock — pola publik situs kurir).
export interface CourierInfo {
  name: string;
  trackUrl?: (resi: string) => string;
}

export const COURIERS: CourierInfo[] = [
  { name: 'JNE', trackUrl: (r) => `https://www.jne.co.id/tracking-package?receipt=${encodeURIComponent(r)}` },
  { name: 'J&T Express', trackUrl: (r) => `https://www.jet.co.id/track?awbs=${encodeURIComponent(r)}` },
  { name: 'SiCepat', trackUrl: (r) => `https://www.sicepat.com/checkAwb?awb=${encodeURIComponent(r)}` },
  { name: 'AnterAja', trackUrl: (r) => `https://anteraja.id/tracking?receipt=${encodeURIComponent(r)}` },
  { name: 'Ninja Xpress', trackUrl: (r) => `https://www.ninjaxpress.co/id-id/tracking?id=${encodeURIComponent(r)}` },
  { name: 'ID Express', trackUrl: (r) => `https://idexpress.com/tracking?waybill=${encodeURIComponent(r)}` },
  { name: 'Pos Indonesia', trackUrl: (r) => `https://www.posindonesia.co.id/id/tracking?barcode=${encodeURIComponent(r)}` },
  { name: 'GoSend' },
  { name: 'GrabExpress' },
  { name: 'Kurir Toko' },
];

export function getCourierTrackUrl(courierName: string | null, resi: string | null): string | null {
  if (!courierName || !resi) return null;
  const courier = COURIERS.find((c) => c.name === courierName);
  return courier?.trackUrl ? courier.trackUrl(resi) : null;
}
