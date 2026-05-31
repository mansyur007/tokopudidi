import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Tokopudidi — Belanja UMKM Indonesia',
    template: '%s · Tokopudidi',
  },
  description: 'Marketplace untuk UMKM kecil Indonesia. Belanja sembako, fashion, kebutuhan rumah, semua dari toko tetangga.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Tokopudidi',
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
