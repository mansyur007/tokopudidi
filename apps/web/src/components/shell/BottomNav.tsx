'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const items = [
  { href: '/',           label: 'Beranda',  icon: '🏠' },
  { href: '/kategori',   label: 'Kategori', icon: '📂' },
  { href: '/pesanan',    label: 'Pesanan',  icon: '📦' },
  { href: '/chat',       label: 'Chat',     icon: '💬' },
  { href: '/akun',       label: 'Akun',     icon: '👤' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.href === '/' ? pathname === '/' : pathname.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={clsx(
                  'flex flex-col items-center justify-center py-2 text-xs min-h-[56px]',
                  active ? 'text-primary font-medium' : 'text-gray-600',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span aria-hidden className="text-lg leading-none">
                  {it.icon}
                </span>
                <span className="mt-1">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
