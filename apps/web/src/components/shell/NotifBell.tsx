'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { getUnreadCount } from '@/lib/api/notifications';
import { Icon } from './Icon';

export function NotifBell() {
  const tokens = useAuthStore((s) => s.tokens);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!tokens?.accessToken) { setCount(0); return; }
    let alive = true;
    const fetchCount = () =>
      getUnreadCount(tokens.accessToken!)
        .then((r) => { if (alive) setCount(r.count); })
        .catch(() => undefined);
    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    const onFocus = () => fetchCount();
    window.addEventListener('focus', onFocus);
    return () => { alive = false; clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [tokens?.accessToken]);

  return (
    <Link
      href="/notifikasi"
      className="icon-btn"
      aria-label={count > 0 ? `Notifikasi (${count} belum dibaca)` : 'Notifikasi'}
    >
      <Icon name="bell" size={22} />
      {count > 0 && <span className="icon-badge">{count > 99 ? '99+' : count}</span>}
    </Link>
  );
}
