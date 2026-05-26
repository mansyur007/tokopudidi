'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

const MENU = [
  { href: '/akun/alamat',     label: 'Alamat Saya',      emoji: '📍' },
  { href: '/pesanan',         label: 'Riwayat Pesanan',  emoji: '📦' },
  { href: '/chat',            label: 'Chat',             emoji: '💬' },
  { href: '/wishlist',        label: 'Wishlist',         emoji: '❤️' },
  { href: '/akun/referral',   label: 'Kode Referral',    emoji: '🎁' },
  { href: '/seller',          label: 'Daftar Jadi Penjual', emoji: '🏪' },
  { href: '/bantuan',         label: 'Bantuan',          emoji: '❓' },
  { href: '/kebijakan',       label: 'Kebijakan Privasi',emoji: '📜' },
];

export default function AkunPage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!user) router.push('/masuk');
  }, [user, router]);

  if (!user) return null;

  function logout() {
    clearAuth();
    router.push('/');
  }

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto">
      <header className="card p-4 flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-xl">
          {user.fullName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{user.fullName}</p>
          <p className="text-sm text-gray-500 truncate">{user.phone}</p>
        </div>
      </header>

      {user.role === 'ADMIN' && (
        <Link href="/admin" className="card flex items-center gap-3 px-4 py-3 mb-4 hover:bg-gray-50 border-purple-200">
          <span aria-hidden className="text-xl">🛡️</span>
          <span className="flex-1 font-medium text-purple-700">Panel Admin</span>
          <span aria-hidden className="text-gray-400">›</span>
        </Link>
      )}

      <div className="card divide-y">
        {MENU.map((m) => (
          <Link key={m.href} href={m.href} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
            <span aria-hidden className="text-xl">{m.emoji}</span>
            <span className="flex-1">{m.label}</span>
            <span aria-hidden className="text-gray-400">›</span>
          </Link>
        ))}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50"
        >
          <span aria-hidden className="text-xl">🚪</span>
          Keluar
        </button>
      </div>
    </div>
  );
}
