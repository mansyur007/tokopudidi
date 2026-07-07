'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { timeAgo } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  getRoomMessages,
  sendChatMessage,
  markRoomRead,
  type ChatMessage,
} from '@/lib/api/chat';
import { getSocket } from '@/lib/socket';

interface Props {
  roomId: string;
  title: string;
  subtitle?: string;
  // Quick reply templates berbeda untuk buyer vs seller.
  quickReplies?: string[];
  // Template chat custom seller (M8-B6) — dropdown 📋 di composer.
  templates?: { id: string; label: string; body: string }[];
}

export function ChatRoom({ roomId, title, subtitle, quickReplies = [], templates = [] }: Props) {
  const { user, tokens } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial load.
  useEffect(() => {
    if (!tokens?.accessToken) return;
    getRoomMessages(tokens.accessToken, roomId).then(setMessages).catch(() => undefined);
  }, [tokens?.accessToken, roomId]);

  // Socket connection — join room, listen events.
  useEffect(() => {
    if (!tokens?.accessToken) return;
    const socket = getSocket(tokens.accessToken);
    if (!socket) return;

    socket.emit('room:join', roomId);

    const onNew = (msg: ChatMessage) => {
      // Cuma yang dari room ini.
      if (msg.roomId !== roomId) return;
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      // Tandai dibaca jika lawan yang kirim.
      if (msg.senderId !== user?.id && tokens?.accessToken) {
        markRoomRead(tokens.accessToken, roomId).catch(() => undefined);
      }
    };
    const onTyping = ({ userId }: { userId: string }) => {
      if (userId !== user?.id) {
        setPeerTyping(true);
        setTimeout(() => setPeerTyping(false), 2000);
      }
    };

    socket.on('message:new', onNew);
    socket.on('typing', onTyping);

    return () => {
      socket.off('message:new', onNew);
      socket.off('typing', onTyping);
      socket.emit('room:leave', roomId);
    };
  }, [tokens?.accessToken, roomId, user?.id]);

  // Auto-scroll ke bawah saat ada message baru.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    if (!tokens?.accessToken) return;
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    try {
      const result = await sendChatMessage(tokens.accessToken, roomId, { content });
      setMessages((prev) => {
        const next = [...prev];
        if (!next.some((m) => m.id === result.message.id)) next.push(result.message);
        if (result.autoReply && !next.some((m) => m.id === result.autoReply!.id)) next.push(result.autoReply);
        return next;
      });
      setDraft('');
    } finally {
      setSending(false);
    }
  }

  function emitTyping() {
    const socket = tokens?.accessToken ? getSocket(tokens.accessToken) : null;
    socket?.emit('typing', roomId);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Maksimal 2MB'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      if (!tokens?.accessToken) return;
      const url = String(reader.result);
      const result = await sendChatMessage(tokens.accessToken, roomId, { content: '', imageUrl: url });
      setMessages((prev) => prev.some((m) => m.id === result.message.id) ? prev : [...prev, result.message]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] bg-white">
      <header className="px-4 py-3 border-b shrink-0">
        <p className="font-semibold truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        {peerTyping && <p className="text-xs text-primary mt-0.5">sedang mengetik...</p>}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">Belum ada pesan. Sapa duluan yuk!</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === user?.id;
          return (
            <div key={m.id} className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={clsx(
                'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                mine ? 'bg-primary text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm',
              )}>
                {m.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt="" className="rounded mb-1 max-h-64" />
                )}
                {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                <p className={clsx('text-[10px] mt-1', mine ? 'text-primary-100' : 'text-gray-500')}>
                  {timeAgo(m.sentAt)}{mine && m.readAt ? ' · dibaca' : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {quickReplies.length > 0 && (
        <div className="px-4 py-2 border-t flex gap-2 overflow-x-auto shrink-0">
          {quickReplies.map((q) => (
            <button
              key={q}
              onClick={() => setDraft(q)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-gray-300 bg-gray-50 hover:bg-gray-100"
            >{q}</button>
          ))}
        </div>
      )}

      <div className="px-3 py-2 border-t flex gap-2 items-center shrink-0 relative">
        <label aria-label="Kirim gambar" className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
          📎
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
        {templates.length > 0 && (
          <>
            <button
              type="button"
              aria-label="Template chat"
              title="Template chat"
              onClick={() => setTplOpen((v) => !v)}
              className={clsx('p-2 rounded-lg hover:bg-gray-100', tplOpen && 'bg-gray-100')}
            >
              📋
            </button>
            {tplOpen && (
              <div className="absolute bottom-full left-3 mb-1 w-72 max-h-64 overflow-y-auto bg-white border rounded-lg shadow-lg z-10">
                <p className="px-3 py-2 text-xs font-semibold text-gray-500 border-b sticky top-0 bg-white">Template Chat</p>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setDraft(t.body); setTplOpen(false); }}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <span className="text-xs font-semibold text-primary">{t.label}</span>
                    <span className="block text-xs text-gray-600 line-clamp-2">{t.body}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <input
          className="input flex-1 min-h-[40px]"
          placeholder="Tulis pesan..."
          value={draft}
          onChange={(e) => { setDraft(e.target.value); emitTyping(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          maxLength={2000}
        />
        <button onClick={handleSend} disabled={sending || !draft.trim()} className="btn-primary px-4">
          Kirim
        </button>
      </div>
    </div>
  );
}
