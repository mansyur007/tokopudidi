'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { NotifBell } from './NotifBell';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const refreshCart = useCartStore((s) => s.refresh);
  const cartCount = useCartStore((s) => s.totalQuantity());

  // Sinkronkan keranjang sekali saat user login muncul.
  useEffect(() => {
    if (user) refreshCart();
  }, [user, refreshCart]);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link href="/" className="font-bold text-primary text-lg shrink-0">
          Tokopudidi
        </Link>
        <form action="/cari" method="get" className="flex-1">
          <input
            type="search"
            name="q"
            placeholder="Cari produk, toko, kategori..."
            className="input"
            aria-label="Cari produk"
          />
        </form>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/keranjang"
            className="relative p-2 rounded-lg hover:bg-gray-100"
            aria-label={`Keranjang ${cartCount} item`}
          >
            <span aria-hidden>🛒</span>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-secondary text-white text-[10px] leading-none min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
          <NotifBell />
          {user ? (
            <Link href="/akun" className="text-sm text-gray-700 hidden md:inline px-2">
              Halo, {user.fullName.split(' ')[0]}
            </Link>
          ) : (
            <Link href="/masuk" className="btn-outline text-sm hidden md:inline-flex">
              Masuk
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
