import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { SITE_URL } from '@/lib/siteUrl';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const DESKRIPSI =
  'Marketplace untuk UMKM kecil Indonesia. Belanja sembako, fashion, kebutuhan rumah, semua dari toko tetangga.';

export const metadata: Metadata = {
  // metadataBase (M12-D3): tanpa ini Next menyusun og:url/og:image sebagai path
  // relatif, dan crawler mengabaikannya.
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Tokopudidi — Belanja UMKM Indonesia',
    template: '%s · Tokopudidi',
  },
  description: DESKRIPSI,
  // Sengaja tanpa `manifest:` — sebelumnya field ini menunjuk
  // `/manifest.webmanifest` yang tidak pernah ada, jadi <head> memancarkan
  // <link rel="manifest"> ke 404. Manifest sesungguhnya dibuat di M15-D1 lewat
  // `app/manifest.ts`, dan Next menautkannya otomatis tanpa field ini.
  applicationName: 'Tokopudidi',
  openGraph: {
    type: 'website',
    siteName: 'Tokopudidi',
    locale: 'id_ID',
    url: SITE_URL,
    title: 'Tokopudidi — Belanja UMKM Indonesia',
    description: DESKRIPSI,
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#1FA463',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
