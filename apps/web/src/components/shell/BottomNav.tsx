'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Icon } from './Icon';
import { useAuthStore } from '@/store/auth';
import { listOrders } from '@/lib/api/orders';
import { BOTTOM_NAV, isBottomNavHidden, isBottomNavItemActive } from './bottomNavRules';

export function BottomNav() {
  const pathname = usePathname() ?? '/';
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const [belumBayar, setBelumBayar] = useState(0);

  // Jumlah pesanan menunggu pembayaran. Memakai endpoint daftar pesanan yang
  // sudah ada (`total` dari respons, limit 1 supaya payload-nya kecil) — tidak
  // perlu endpoint hitung baru.
  //
  // Efek samping yang kebetulan berguna: endpoint ini menjalankan sapuan
  // kedaluwarsa QRIS (M10-A5), jadi pesanan yang lewat batas waktu otomatis
  // keluar dari hitungan ini.
  useEffect(() => {
    if (!token) { setBelumBayar(0); return; }
    let alive = true;
    const ambil = () =>
      listOrders(token, 'PENDING_PAYMENT', 1, 1)
        .then((r) => { if (alive) setBelumBayar(r.total); })
        .catch(() => undefined);
    ambil();
    const onFocus = () => ambil();
    window.addEventListener('focus', onFocus);
    return () => { alive = false; window.removeEventListener('focus', onFocus); };
  }, [token, pathname]);

  if (isBottomNavHidden(pathname)) return null;

  return (
    <nav
      aria-label="Navigasi utama"
      className={clsx(
        'md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-line',
        // Ruang aman untuk gesture bar iOS.
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="grid grid-cols-5">
        {BOTTOM_NAV.map((it) => {
          const active = isBottomNavItemActive(it.href, pathname);
          const badge = it.badge === 'pesananBelumBayar' ? belumBayar : 0;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'flex flex-col items-center justify-center py-2 min-h-[56px] text-[11px] no-underline',
                  active ? 'text-primary font-semibold' : 'text-ink-muted',
                )}
              >
                <span className="relative">
                  <Icon name={it.icon} size={22} filled={active} />
                  {badge > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-red-600 text-white text-[9px] font-bold"
                      aria-hidden
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                <span className="mt-1">
                  {it.label}
                  {/* Angka badge diumumkan lewat teks, bukan lewat lingkaran merah. */}
                  {badge > 0 && <span className="sr-only"> ({badge} belum dibayar)</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
