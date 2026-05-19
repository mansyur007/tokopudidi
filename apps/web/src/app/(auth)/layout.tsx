import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="px-4 py-4 border-b bg-white">
        <Link href="/" className="font-bold text-primary text-lg">
          Tokopudidi
        </Link>
      </header>
      <main className="flex-1 px-4 py-6 flex items-start justify-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
