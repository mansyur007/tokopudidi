import Link from 'next/link';
import type { Metadata } from 'next';
import { getActiveFlashSale } from '@/lib/api/flashSale';
import { FlashSaleSection } from '@/components/home/FlashSaleSection';

export const metadata: Metadata = {
  title: 'Flash Sale — Tokopudidi',
  description: 'Produk pilihan dengan harga khusus dan kuota terbatas. Buruan sebelum habis!',
};

export default async function FlashSalePage() {
  // Gagal ambil diperlakukan sama dengan "tidak ada event": halaman ini bukan
  // tempat menampilkan error jaringan ke pembeli.
  const event = await getActiveFlashSale().catch(() => null);

  if (!event || event.items.length === 0) {
    return (
      <div className="wrap py-10 pb-16 text-center">
        <p className="text-4xl mb-2">⚡</p>
        <h1 className="text-lg font-extrabold text-ink mb-1">Belum ada flash sale berjalan</h1>
        <p className="text-sm text-ink-muted mb-5">
          Event berikutnya bisa muncul kapan saja. Sementara itu, lihat-lihat dulu yuk.
        </p>
        <Link href="/" className="btn-primary inline-flex">Kembali ke Beranda</Link>
      </div>
    );
  }

  return (
    <div className="wrap py-3 md:py-4 pb-10">
      <FlashSaleSection event={event} layout="grid" />
    </div>
  );
}
