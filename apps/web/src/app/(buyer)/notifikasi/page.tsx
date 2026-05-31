'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { timeAgo } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from '@/lib/api/notifications';

const TYPE_LABEL: Record<NotificationItem['type'], { emoji: string; tag: string }> = {
  ORDER_UPDATE: { emoji: '📦', tag: 'Pesanan' },
  NEW_MESSAGE:  { emoji: '💬', tag: 'Chat' },
  PROMO:        { emoji: '🎉', tag: 'Promo' },
  SYSTEM:       { emoji: '🔔', tag: 'Sistem' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, tokens } = useAuthStore();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) router.push('/masuk');
  }, [user, router]);

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try { setItems(await listNotifications(tokens.accessToken)); }
    finally { setLoading(false); }
  }, [tokens?.accessToken]);

  useEffect(() => { load(); }, [load]);

  async function handleMarkAll() {
    if (!tokens?.accessToken || busy) return;
    setBusy(true);
    try {
      await markAllNotificationsRead(tokens.accessToken);
      setItems((prev) => prev.map((it) => ({ ...it, readAt: it.readAt ?? new Date().toISOString() })));
    } finally { setBusy(false); }
  }

  async function handleClickItem(it: NotificationItem) {
    if (!tokens?.accessToken) return;
    if (!it.readAt) {
      markNotificationRead(tokens.accessToken, it.id).catch(() => undefined);
      setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, readAt: new Date().toISOString() } : x));
    }
    if (it.linkUrl) router.push(it.linkUrl);
  }

  if (!user) return null;
  const unread = items.filter((it) => !it.readAt).length;

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-8">
      <header className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-semibold">Notifikasi</h1>
          <p className="text-xs text-gray-500">
            {unread > 0 ? `${unread} belum dibaca` : 'Semua sudah dibaca'}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={handleMarkAll} disabled={busy} className="btn-outline text-sm">
            Tandai Semua Dibaca
          </button>
        )}
      </header>

      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {!loading && items.length === 0 && (
        <div className="card p-8 text-center text-gray-600">
          Belum ada notifikasi. Nanti kalau ada update pesanan atau chat baru, muncul di sini.
        </div>
      )}

      <ul className="space-y-2">
        {items.map((it) => {
          const meta = TYPE_LABEL[it.type] ?? TYPE_LABEL.SYSTEM;
          const isUnread = !it.readAt;
          return (
            <li key={it.id}>
              <button
                onClick={() => handleClickItem(it)}
                className={clsx(
                  'w-full text-left card p-3 flex gap-3 hover:bg-gray-50',
                  isUnread && 'border-l-4 border-primary bg-primary-50/30',
                )}
              >
                <span className="text-xl shrink-0" aria-hidden>{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={clsx('text-sm truncate', isUnread && 'font-semibold')}>
                      {it.title}
                    </p>
                    <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(it.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{it.body}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{meta.tag}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-center text-xs text-gray-400 mt-4">
        Menampilkan 50 notifikasi terbaru. <Link href="/" className="text-primary">Kembali ke beranda →</Link>
      </p>
    </div>
  );
}
