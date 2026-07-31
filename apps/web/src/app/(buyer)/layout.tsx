import { Header } from '@/components/shell/Header';
import { BottomNav } from '@/components/shell/BottomNav';
import { Footer } from '@/components/shell/Footer';
import { ChatFab } from '@/components/shell/ChatFab';

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* pb-20 untuk kasih ruang bottom nav di mobile; saat cetak nav-nya
          disembunyikan, jadi ruangnya tidak perlu ikut tercetak. */}
      <main className="flex-1 pb-20 md:pb-0 print:pb-0">{children}</main>
      <Footer />
      <BottomNav />
      <ChatFab />
    </div>
  );
}
