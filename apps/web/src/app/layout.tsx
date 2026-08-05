import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { SITE_URL } from '@/lib/siteUrl';
import { BRAND_COLOR, BRAND_DESCRIPTION, BRAND_NAME, BRAND_TITLE } from '@/lib/brand';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  // metadataBase (M12-D3): tanpa ini Next menyusun og:url/og:image sebagai path
  // relatif, dan crawler mengabaikannya.
  metadataBase: new URL(SITE_URL),
  title: {
    default: BRAND_TITLE,
    template: `%s · ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  // Sengaja tanpa `manifest:` — `app/manifest.ts` (M15-D1) sudah membuat Next
  // menyisipkan <link rel="manifest"> sendiri, jadi field ini mubazir. (Diuji:
  // menambahkannya TIDAK menggandakan tag — keluarannya persis sama — tapi dulu
  // field ini ada TANPA file manifest, dan tag-nya menunjuk 404. Menyimpannya
  // berarti menyimpan lagi peluang href yang bisa lepas dari manifest asli.)
  applicationName: BRAND_NAME,
  openGraph: {
    type: 'website',
    siteName: BRAND_NAME,
    locale: 'id_ID',
    url: SITE_URL,
    title: BRAND_TITLE,
    description: BRAND_DESCRIPTION,
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  // Sama dengan `theme_color` di app/manifest.ts — keduanya baca @/lib/brand.
  themeColor: BRAND_COLOR,
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
