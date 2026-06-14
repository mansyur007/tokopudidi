import Link from 'next/link';
import { Icon } from './Icon';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Tokopudidi',
    links: [
      { label: 'Tentang Kami', href: '#' },
      { label: 'Karier', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Pusat Edukasi Seller', href: '#' },
    ],
  },
  {
    title: 'Beli',
    links: [
      { label: 'Tagihan & Top Up', href: '#' },
      { label: 'Tiket Kereta', href: '#' },
      { label: 'Promo Hari Ini', href: '#' },
      { label: 'Tokopudidi COD', href: '#' },
    ],
  },
  {
    title: 'Jual',
    links: [
      { label: 'Buka Toko Gratis', href: '/seller' },
      { label: 'Panduan Berjualan', href: '/seller' },
      { label: 'Pusat Edukasi Seller', href: '#' },
      { label: 'Mitra Toppers', href: '#' },
    ],
  },
  {
    title: 'Bantuan',
    links: [
      { label: 'Pusat Bantuan', href: '/bantuan' },
      { label: 'Tokopudidi Care', href: '#' },
      { label: 'Syarat & Ketentuan', href: '/syarat' },
      { label: 'Kebijakan Privasi', href: '/kebijakan' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="hidden md:block bg-white border-t border-line mt-8">
      <div className="wrap py-10 grid gap-10" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1.6fr' }}>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="font-extrabold text-[13px] text-ink mb-3">{col.title}</p>
            <ul className="space-y-2 text-[13px] text-ink-soft">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-primary no-underline">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="font-extrabold text-[13px] text-ink mb-3">Nikmati keuntungan spesial di aplikasi</p>
          <ul className="space-y-1.5 text-[12.5px] text-ink-soft mb-4">
            {['Notif promo eksklusif', 'Top up & tagihan cepat', 'Pelacakan pesanan realtime'].map((x) => (
              <li key={x} className="flex items-center gap-1.5">
                <Icon name="check" size={14} className="text-primary" /> {x}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2.5">
            <div className="w-16 h-16 border border-line rounded-md grid place-items-center text-[9px] text-ink-muted font-mono bg-page">QR</div>
            <div className="flex flex-col gap-1.5">
              {['Google Play', 'App Store'].map((s) => (
                <span key={s} className="border border-line-dark rounded-md px-2.5 py-1 text-[11px] font-semibold text-ink-soft bg-white">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="wrap py-4 flex items-center justify-between text-[12px] text-ink-muted">
          <span>© {new Date().getFullYear()} Tokopudidi. Dibuat untuk UMKM Indonesia. · Part of{' '}
            <a href="https://emha.space" target="_blank" rel="noopener" className="underline hover:text-primary">EMHA Universe</a>
          </span>
          <div className="flex items-center gap-1.5">
            <button className="lang-pill" data-active="true">Indonesia</button>
            <button className="lang-pill">English</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
