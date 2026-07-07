'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth';

const NAV = [
  { href: '/admin',          label: 'Dashboard',  emoji: '📊' },
  { href: '/admin/pengguna', label: 'Pengguna',   emoji: '👥' },
  { href: '/admin/toko',     label: 'Toko',       emoji: '🏪' },
  { href: '/admin/produk',   label: 'Produk',     emoji: '📦' },
  { href: '/admin/refund',   label: 'Refund',     emoji: '↩️' },
  { href: '/admin/laporan',  label: 'Laporan',    emoji: '🚩' },
  { href: '/admin/banner',   label: 'Banner',     emoji: '🖼️' },
  { href: '/admin/kategori', label: 'Kategori',   emoji: '🗂️' },
  { href: '/scrap',          label: 'Scraper',    emoji: '🔎' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [navOpen, setNavOpen] = useState(false);

  if (!user) {
    if (typeof window !== 'undefined') router.push('/masuk');
    return null;
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-6 max-w-md text-center">
          <h2 className="text-lg font-semibold mb-2">Khusus Admin</h2>
          <p className="text-sm text-gray-600 mb-4">
            Halaman ini hanya untuk admin Tokopudidi. Akunmu tidak punya akses.
          </p>
          <Link href="/" className="btn-primary inline-flex">Kembali ke Beranda</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => setNavOpen(true)} aria-label="Buka menu" className="p-2 -ml-2">☰</button>
        <Link href="/admin" className="font-bold text-primary">Admin · Tokopudidi</Link>
      </header>

      <aside
        className={clsx(
          'fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r transition-transform',
          navOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="px-4 py-4 border-b flex items-center justify-between">
          <Link href="/admin" className="font-bold text-primary">Admin · Tokopudidi</Link>
          <button onClick={() => setNavOpen(false)} className="md:hidden p-2 -mr-2" aria-label="Tutup menu">✕</button>
        </div>
        <div className="px-4 py-3 border-b text-sm">
          <p className="font-medium truncate">🛡️ {user.fullName}</p>
          <p className="text-xs text-gray-500">Administrator</p>
        </div>
        <nav className="p-2">
          {NAV.map((it) => {
            const active = it.href === '/admin' ? pathname === '/admin' : pathname.startsWith(it.href);
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
            <span>Lihat Toko</span>
          </Link>
        </nav>
      </aside>

      {navOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setNavOpen(false)} aria-hidden />
      )}

      <main className="flex-1 mt-12 md:mt-0 min-w-0">{children}</main>
    </div>
  );
}
