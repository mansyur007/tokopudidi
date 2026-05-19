'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { timeAgo } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { listChatRooms, type ChatRoomSeller } from '@/lib/api/chat';
import { ChatRoom } from '@/components/chat/ChatRoom';

const QUICK_REPLIES_SELLER = [
  'Ready kak',
  'Sebentar dicek dulu ya',
  'Sudah saya kirim ya',
  'Estimasi 1-2 hari sampai',
];

export default function SellerChatPage() {
  const searchParams = useSearchParams();
  const { tokens } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoomSeller[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    listChatRooms<ChatRoomSeller>(tokens.accessToken).then((items) => {
      setRooms(items);
      const roomQ = searchParams.get('room');
      if (roomQ) setActiveRoomId(roomQ);
      else if (items.length > 0) setActiveRoomId(items[0].id);
    });
  }, [tokens?.accessToken, searchParams]);

  const active = rooms.find((r) => r.id === activeRoomId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(100vh-3rem)] md:h-screen">
      <aside className={`md:col-span-1 border-r overflow-y-auto bg-white ${active ? 'hidden md:block' : 'block'}`}>
        <header className="px-4 py-3 border-b sticky top-0 bg-white">
          <h1 className="font-semibold">Chat Pembeli</h1>
        </header>
        {rooms.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">Belum ada chat masuk.</p>
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
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-semibold shrink-0">
                    {r.buyer.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.buyer.fullName}</p>
                    <p className="text-xs text-gray-500 truncate">{last?.content ?? '—'}</p>
                  </div>
                  <span className="text-[10px] text-gray-400">{last ? timeAgo(last.sentAt) : ''}</span>
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
              title={active.buyer.fullName}
              subtitle="Pembeli"
              quickReplies={QUICK_REPLIES_SELLER}
            />
          </>
        ) : (
          <div className="hidden md:flex h-full items-center justify-center text-gray-400 text-sm">
            Pilih chat untuk mulai
          </div>
        )}
      </section>
    </div>
  );
}
