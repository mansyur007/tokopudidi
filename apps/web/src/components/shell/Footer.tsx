import Link from 'next/link';

export function Footer() {
  return (
    <footer className="hidden md:block bg-white border-t border-gray-200 mt-8">
      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-3 gap-6 text-sm">
        <div>
          <p className="font-semibold mb-2">Tokopudidi</p>
          <p className="text-gray-600">
            Marketplace UMKM Indonesia. Belanja sembako, fashion, kebutuhan rumah dari penjual lokal.
          </p>
        </div>
        <div>
          <p className="font-semibold mb-2">Bantuan</p>
          <ul className="space-y-1 text-gray-600">
            <li><Link href="/bantuan">Pusat Bantuan</Link></li>
            <li><Link href="/kebijakan">Kebijakan Privasi</Link></li>
            <li><Link href="/syarat">Syarat & Ketentuan</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-2">Untuk Penjual</p>
          <ul className="space-y-1 text-gray-600">
            <li><Link href="/seller">Buka Toko Gratis</Link></li>
            <li><Link href="/seller/panduan">Panduan Berjualan</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-100 px-4 py-3 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Tokopudidi. Dibuat untuk UMKM Indonesia.
      </div>
    </footer>
  );
}
