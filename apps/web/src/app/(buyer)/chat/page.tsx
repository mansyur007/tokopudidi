'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { timeAgo } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { listChatRooms, openRoom, type ChatRoomBuyer } from '@/lib/api/chat';
import { ChatRoom } from '@/components/chat/ChatRoom';

const QUICK_REPLIES_BUYER = [
  'Halo, ready stock?',
  'Bisa nego harganya?',
  'Kapan dikirim ya?',
  'Ada varian lain?',
];

function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, tokens } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoomBuyer[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // ?shop=slug atau ?room=id
  useEffect(() => {
    if (!user) { router.push('/masuk'); return; }
    if (!tokens?.accessToken) return;

    const roomQ = searchParams.get('room');
    const shopSlug = searchParams.get('shop');

    listChatRooms<ChatRoomBuyer>(tokens.accessToken).then((items) => {
      setRooms(items);
      if (roomQ) {
        setActiveRoomId(roomQ);
      } else if (shopSlug) {
        // Buka room ke shop berdasarkan slug.
        const existing = items.find((r) => r.shop.slug === shopSlug);
        if (existing) {
          setActiveRoomId(existing.id);
        } else {
          // Resolve slug → id, lalu open.
          fetch(`/api/v1/shops/${shopSlug}`).catch(() => undefined); // optional warmup
          fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/shops/${shopSlug}`)
            .then((r) => r.json())
            .then(async (j) => {
              if (j?.success && tokens?.accessToken) {
                const r = await openRoom(tokens.accessToken, j.data.id);
                setActiveRoomId(r.id);
                listChatRooms<ChatRoomBuyer>(tokens.accessToken).then(setRooms);
              }
            })
            .catch(() => undefined);
        }
      } else if (items.length > 0) {
        setActiveRoomId(items[0].id);
      }
    });
  }, [user, tokens?.accessToken, searchParams, router]);

  if (!user) return null;
  const active = rooms.find((r) => r.id === activeRoomId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)]">
      {/* Sidebar room list */}
      <aside className={`md:col-span-1 border-r overflow-y-auto bg-white ${active ? 'hidden md:block' : 'block'}`}>
        <header className="px-4 py-3 border-b sticky top-0 bg-white">
          <h1 className="font-semibold">Chat</h1>
        </header>
        {rooms.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">
            Belum ada chat. Buka produk dan mulai chat penjualnya yuk.
          </p>
        )}
        <ul className="divide-y">
          {rooms.map((r) => {
            const last = r.messages[0];
            return (
              <li key={r.id}>
                <button
                  onClick={() => setActiveRoomId(r.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 ${
                    activeRoomId === r.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="relative w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0">
                    {r.shop.logoUrl && (
                      <Image src={r.shop.logoUrl} alt="" fill sizes="40px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.shop.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {last?.content ?? '—'}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {last ? timeAgo(last.sentAt) : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className={`md:col-span-2 ${active ? 'block' : 'hidden md:block'} relative`}>
        {active ? (
          <>
            <button
              onClick={() => setActiveRoomId(null)}
              className="md:hidden absolute top-2 left-2 p-2 z-10 bg-white/80 rounded"
              aria-label="Kembali"
            >←</button>
            <ChatRoom
              roomId={active.id}
              title={active.shop.name}
              subtitle={active.shop.isOpen ? '🟢 Online' : '🟠 Toko tutup'}
              quickReplies={QUICK_REPLIES_BUYER}
            />
          </>
        ) : (
          <div className="hidden md:flex h-full items-center justify-center text-gray-400 text-sm">
            Pilih chat untuk mulai
          </div>
        )}
      </section>

      {rooms.length === 0 && !active && (
        <div className="md:col-span-3 hidden md:flex items-center justify-center text-gray-400 text-sm h-full">
          <Link href="/" className="btn-primary">Cari Produk</Link>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="px-4 py-8 text-center text-sm text-gray-500">Memuat chat...</div>}>
      <ChatPageInner />
    </Suspense>
  );
}
