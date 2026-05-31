'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { Icon } from './Icon';

// FAB chat — tampil hanya untuk user login dan di breakpoint desktop
// (mobile sudah punya entry chat di BottomNav).
export function ChatFab() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return (
    <Link href="/chat" className="chat-fab hidden md:flex no-underline" aria-label="Buka chat">
      <Icon name="chat" size={18} />
      <span className="font-bold text-[13px]">Chat</span>
    </Link>
  );
}
