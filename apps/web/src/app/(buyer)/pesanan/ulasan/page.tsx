'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import {
  getPendingReviews,
  createReview,
  type ReviewableItem,
} from '@/lib/api/reviews';
import { ApiClientError } from '@/lib/api/client';

export default function PendingReviewPage() {
  const router = useRouter();
  const { user, tokens } = useAuthStore();
  const [items, setItems] = useState<ReviewableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.push('/masuk');
  }, [user, router]);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try { setItems(await getPendingReviews(tokens.accessToken)); }
    finally { setLoading(false); }
  }, [tokens?.accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!user) return null;
  const active = items.find((it) => it.id === activeId);

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-8">
      <header className="mb-3">
        <Link href="/pesanan" className="text-sm text-primary">← Kembali ke Pesanan</Link>
        <h1 className="text-lg font-semibold mt-1">Berikan Ulasan</h1>
        <p className="text-sm text-gray-500">Item dari pesanan selesai yang belum kamu ulas.</p>
      </header>

      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {!loading && items.length === 0 && (
        <div className="card p-8 text-center text-gray-600">
          Mantap, semua sudah diulas. Makasih ya!
        </div>
      )}

      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="card p-3 flex gap-3">
            <div className="relative w-16 h-16 rounded bg-gray-100 overflow-hidden shrink-0">
              {it.productImage && (
                <Image src={it.productImage} alt="" fill sizes="64px" className="object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2">{it.productName}</p>
              {it.variantName && <p className="text-xs text-gray-500">Varian: {it.variantName}</p>}
              <p className="text-xs text-gray-500 mt-0.5">
                {it.order.shop.name} · {it.order.orderNumber}
              </p>
              <button
                onClick={() => setActiveId(it.id)}
                className="btn-primary text-sm mt-2 px-3 py-1.5 min-h-0"
              >
                Beri Ulasan
              </button>
            </div>
          </div>
        ))}
      </div>

      {active && (
        <ReviewModal
          item={active}
          onClose={() => setActiveId(null)}
          onDone={async () => { setActiveId(null); await refresh(); }}
        />
      )}
    </div>
  );
}

function ReviewModal({ item, onClose, onDone }: {
  item: ReviewableItem;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const { tokens } = useAuthStore();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageUrls.length >= 3) { setError('Maksimal 3 foto'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Maksimal 2MB per foto'); return; }
    const reader = new FileReader();
    reader.onload = () => setImageUrls((prev) => [...prev, String(reader.result)]);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleSubmit() {
    if (!tokens?.accessToken) return;
    setBusy(true); setError(null);
    try {
      await createReview(tokens.accessToken, {
        orderItemId: item.id,
        rating,
        comment: comment || undefined,
        imageUrls,
      });
      await onDone();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal kirim ulasan');
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg md:rounded-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <header className="px-4 py-3 border-b sticky top-0 bg-white flex items-center justify-between">
          <h2 className="font-semibold">Ulasan untuk {item.productName}</h2>
          <button onClick={onClose} aria-label="Tutup" className="text-gray-500 text-xl">✕</button>
        </header>
        <div className="p-4 space-y-3">
          <div>
            <p className="label">Rating</p>
            <div className="flex gap-1">
              {[1,2,3,4,5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  aria-label={`${n} bintang`}
                  className={`text-3xl ${n <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                >★</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Komentar (opsional, max 500 char)</label>
            <textarea
              className="input min-h-[100px]"
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Bagaimana pengalaman belanja kamu?"
            />
          </div>
          <div>
            <label className="label">Foto (opsional, max 3, 2MB per file)</label>
            <div className="flex gap-2 flex-wrap">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded border overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImageUrls((p) => p.filter((_, idx) => idx !== i))}
                    aria-label="Hapus"
                    className="absolute top-0 right-0 bg-black/60 text-white text-xs w-5 h-5 leading-none"
                  >✕</button>
                </div>
              ))}
              {imageUrls.length < 3 && (
                <label className="w-16 h-16 rounded border-2 border-dashed flex items-center justify-center text-gray-400 cursor-pointer">
                  + Foto
                  <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
                </label>
              )}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex gap-2 p-4 border-t sticky bottom-0 bg-white">
          <button onClick={onClose} className="btn-outline flex-1">Batal</button>
          <button onClick={handleSubmit} disabled={busy} className="btn-primary flex-1">
            {busy ? 'Mengirim...' : 'Kirim Ulasan'}
          </button>
        </div>
      </div>
    </div>
  );
}
