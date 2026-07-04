'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useWishlistStore } from '@/store/wishlist';
import { NotifBell } from './NotifBell';
import { Icon } from './Icon';
import { SearchBar } from './SearchBar';

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 select-none shrink-0">
      <span
        className="grid place-items-center w-[30px] h-[30px] rounded-[9px] bg-primary"
        style={{ boxShadow: '0 2px 6px rgba(31,164,99,0.35)' }}
        aria-hidden
      >
        <svg viewBox="0 0 32 32" width="19" height="19" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(16 16) scale(0.64) translate(-16 -16)">
            <path d="M11 13 v-1.6 a5 5 0 0 1 10 0 V13" fill="none" stroke="#ffffff" strokeWidth="2.7" strokeLinecap="round" />
            <rect x="6.4" y="12" width="19.2" height="15.4" rx="4.4" fill="#ffffff" />
          </g>
        </svg>
      </span>
      <span className="font-extrabold text-[21px] tracking-tight text-ink leading-none">
        toko<span className="text-primary">pudidi</span>
      </span>
    </Link>
  );
}

export function Header() {
  const user = useAuthStore((s) => s.user);
  const refreshCart = useCartStore((s) => s.refresh);
  const cartCount = useCartStore((s) => s.totalQuantity());
  const refreshWishlist = useWishlistStore((s) => s.refresh);
  const wishlistCount = useWishlistStore((s) => s.ids.size);

  useEffect(() => {
    if (user) { refreshCart(); refreshWishlist(); }
  }, [user, refreshCart, refreshWishlist]);

  return (
    <header className="sticky top-0 z-40 bg-white" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
      {/* Top utility strip — desktop only */}
      <div className="hidden md:block border-b border-line">
        <div className="wrap flex items-center justify-between h-[30px] text-[11.5px] text-ink-muted">
          <div className="flex items-center gap-1.5 font-semibold text-ink">
            <span className="text-primary">●</span>
            Gratis Ongkir + Banyak Promo, belanja di aplikasi
            <Icon name="chevron-right" size={13} />
          </div>
          <nav className="flex items-center gap-[18px]">
            {['Tentang Tokopudidi', 'Pusat Edukasi Seller', 'Promo', 'Tokopudidi Care'].map((x) => (
              <a key={x} href="#" onClick={(e) => e.preventDefault()} className="text-ink-muted hover:text-primary no-underline">
                {x}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Main bar */}
      <div className="wrap flex items-center gap-3 md:gap-[18px] h-[62px]">
        <Logo />
        <button type="button" className="hidden md:inline-flex ghost-btn items-center gap-1.5 font-semibold text-sm">
          <Icon name="menu" size={18} /> Kategori
        </button>
        <SearchBar />
        <div className="flex items-center gap-1 shrink-0">
          <Link href="/wishlist" className="icon-btn hidden md:inline-grid" aria-label={`Wishlist ${wishlistCount} item`}>
            <Icon name="heart" size={22} />
            {wishlistCount > 0 && <span className="icon-badge">{wishlistCount > 99 ? '99+' : wishlistCount}</span>}
          </Link>
          <Link href="/keranjang" className="icon-btn" aria-label={`Keranjang ${cartCount} item`}>
            <Icon name="cart" size={22} />
            {cartCount > 0 && <span className="icon-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
          </Link>
          <NotifBell />
          <Link href="/chat" className="icon-btn hidden md:inline-grid" aria-label="Chat">
            <Icon name="chat" size={22} />
          </Link>
        </div>
        <div className="hidden md:block w-px h-7 bg-line" />
        {user ? (
          <Link href="/akun" className="hidden md:flex items-center gap-2.5 shrink-0">
            <span className="w-[30px] h-[30px] rounded-full bg-primary-50 border border-line grid place-items-center text-primary font-bold text-sm" aria-hidden>
              {user.fullName.charAt(0).toUpperCase()}
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] text-ink-muted max-w-[120px] truncate">Toko Saya</span>
              <span className="block text-[13px] font-bold text-ink">{user.fullName.split(' ')[0].toLowerCase()}</span>
            </span>
          </Link>
        ) : (
          <Link href="/masuk" className="btn-outline hidden md:inline-flex text-sm">
            Masuk
          </Link>
        )}
      </div>

      {/* Location bar — desktop only */}
      <div className="hidden md:block">
        <div className="wrap flex justify-end pb-2 -mt-1">
          <button className="ghost-btn flex items-center gap-1.5 text-[12.5px] text-ink">
            <Icon name="pin" size={15} className="text-primary" />
            Dikirim ke <strong className="font-bold">Alamat Utama</strong>
            <Icon name="chevron-down" size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
