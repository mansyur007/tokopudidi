'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth';
import { getSellerShop, type SellerShop } from '@/lib/api/seller';
import { ApiClientError } from '@/lib/api/client';

const NAV = [
  { href: '/seller',            label: 'Dashboard',     emoji: '📊' },
  { href: '/seller/produk',     label: 'Produk',        emoji: '📦' },
  { href: '/seller/pesanan',    label: 'Pesanan',       emoji: '🧾' },
  { href: '/seller/chat',       label: 'Chat',          emoji: '💬' },
  { href: '/seller/ulasan',     label: 'Ulasan',        emoji: '⭐' },
  { href: '/seller/promo',      label: 'Voucher Toko',  emoji: '🎟️' },
  { href: '/seller/pembayaran', label: 'Verifikasi Bayar', emoji: '💰' },
  { href: '/seller/keuangan',   label: 'Keuangan',      emoji: '💵' },
  { href: '/seller/pengaturan', label: 'Pengaturan Toko', emoji: '⚙️' },
];

export function SellerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, tokens } = useAuthStore();
  const [shop, setShop] = useState<SellerShop | null>(null);
  const [needsRegister, setNeedsRegister] = useState(false);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  // Halaman wizard tidak butuh shop, jadi skip cek.
  const isRegisterPage = pathname === '/seller/daftar';

  useEffect(() => {
    if (!user) { router.push('/masuk'); return; }
    if (isRegisterPage) { setLoading(false); return; }
    if (!tokens?.accessToken) return;
    getSellerShop(tokens.accessToken)
      .then((s) => setShop(s))
      .catch((err) => {
        if (err instanceof ApiClientError && (err.status === 403 || err.status === 404)) {
          setNeedsRegister(true);
        }
      })
      .finally(() => setLoading(false));
  }, [user, tokens?.accessToken, router, isRegisterPage]);

  if (!user) return null;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Memuat...</div>;
  }

  if (needsRegister && !isRegisterPage) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-6 max-w-md text-center">
          <h2 className="text-lg font-semibold mb-2">Buka Tokomu Sendiri</h2>
          <p className="text-sm text-gray-600 mb-4">
            Akun kamu belum terdaftar sebagai penjual. Yuk daftar — gratis dan cepat.
          </p>
          <Link href="/seller/daftar" className="btn-primary inline-flex">
            Mulai Daftar
          </Link>
        </div>
      </div>
    );
  }

  // Wizard page: tanpa sidebar.
  if (isRegisterPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Buka menu"
          className="p-2 -ml-2"
        >☰</button>
        <Link href="/seller" className="font-bold text-primary">Seller · Tokopudidi</Link>
      </header>

      {/* Sidebar — desktop persistent, mobile drawer */}
      <aside
        className={clsx(
          'fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r transition-transform',
          navOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="px-4 py-4 border-b flex items-center justify-between">
          <Link href="/seller" className="font-bold text-primary">Seller · Tokopudidi</Link>
          <button onClick={() => setNavOpen(false)} className="md:hidden p-2 -mr-2" aria-label="Tutup menu">✕</button>
        </div>
        {shop && (
          <div className="px-4 py-3 border-b text-sm">
            <p className="font-medium truncate">🏪 {shop.name}</p>
            <p className="text-xs text-gray-500 truncate">{shop.city}</p>
            <p className="text-xs mt-1">
              {shop.isOpen ? <span className="text-green-700">● Buka</span> : <span className="text-orange-700">● Tutup</span>}
              {!shop.ktpVerified && <span className="ml-2 text-orange-600">(belum terverifikasi)</span>}
            </p>
          </div>
        )}
        <nav className="p-2">
          {NAV.map((it) => {
            const active = it.href === '/seller' ? pathname === '/seller' : pathname.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setNavOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg mb-1',
                  active ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                <span aria-hidden>{it.emoji}</span>
                <span>{it.label}</span>
              </Link>
            );
          })}
          <hr className="my-3" />
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
            <span aria-hidden>🛒</span>
            <span>Mode Pembeli</span>
          </Link>
        </nav>
      </aside>

      {navOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setNavOpen(false)}
          aria-hidden
        />
      )}

      <main className="flex-1 mt-12 md:mt-0 min-w-0">{children}</main>
    </div>
  );
}
