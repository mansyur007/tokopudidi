import type { Metadata, Viewport } from 'next';
import './globals.css';

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
  themeColor: '#2D6A4F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
