'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth';
import { Icon } from './Icon';
import { isBottomNavHidden } from './bottomNavRules';

/**
 * FAB chat — tampil untuk user yang sudah login.
 *
 * Sebelum M12-A11 komponen ini `hidden md:flex` karena chat punya tab sendiri di
 * bottom nav. Tab itu kini digantikan Wishlist (yang tadinya tidak bisa
 * dijangkau dari mobile sama sekali), jadi FAB inilah satu-satunya jalan ke chat
 * di mobile dan harus ikut tampil di sana — diangkat di atas bottom nav.
 */
export function ChatFab() {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname() ?? '/';

  if (!user) return null;
  // Di halaman chat FAB-nya tidak ada gunanya; di checkout/bayar ia bersaing
  // dengan tombol aksi yang menempel di dasar layar.
  if (pathname === '/chat' || pathname.startsWith('/chat/') || isBottomNavHidden(pathname)) {
    return null;
  }

  return (
    <Link
      href="/chat"
      aria-label="Buka chat"
      className={clsx(
        'chat-fab no-underline',
        // Mobile: duduk di atas bottom nav (tinggi 56px + safe area) supaya
        // tidak saling menutupi. Desktop: posisi asli dari kelas .chat-fab.
        'bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:bottom-6',
      )}
    >
      <Icon name="chat" size={18} />
      <span className="font-bold text-[13px]">Chat</span>
    </Link>
  );
}
