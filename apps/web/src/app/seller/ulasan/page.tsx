'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { timeAgo } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { getSellerShop } from '@/lib/api/seller';
import { listShopReviews, replyReview, type ReviewItem } from '@/lib/api/reviews';
import { ApiClientError } from '@/lib/api/client';

export default function SellerReviewsPage() {
  const { tokens } = useAuthStore();
  const [shopId, setShopId] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [filter, setFilter] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    getSellerShop(tokens.accessToken).then((s) => setShopId(s.id));
  }, [tokens?.accessToken]);

  async function refresh() {
    if (!shopId) return;
    setLoading(true);
    try {
      const r = await listShopReviews(shopId, 1, filter);
      setItems(r.items);
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [shopId, filter]);

  async function handleReply(reviewId: string) {
    if (!tokens?.accessToken) return;
    const reply = (replyDraft[reviewId] ?? '').trim();
    if (reply.length < 2) { setMsg('Balasan minimal 2 karakter'); return; }
    setBusyId(reviewId); setMsg(null);
    try {
      await replyReview(tokens.accessToken, reviewId, reply);
      setReplyDraft((p) => ({ ...p, [reviewId]: '' }));
      await refresh();
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : 'Gagal kirim balasan');
    } finally { setBusyId(null); }
  }

  return (
    <div className="px-4 md:px-6 py-4 max-w-3xl space-y-3">
      <h1 className="text-xl font-semibold">Ulasan Toko</h1>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter(undefined)}
          className={'shrink-0 px-3 py-1.5 rounded-full text-sm border ' + (!filter ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300')}
        >Semua</button>
        {[5, 4, 3, 2, 1].map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={'shrink-0 px-3 py-1.5 rounded-full text-sm border ' + (filter === r ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300')}
          >{r}⭐</button>
        ))}
      </nav>

      {msg && <p className="text-sm text-red-600">{msg}</p>}

      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {!loading && items.length === 0 && (
        <div className="card p-8 text-center text-gray-600">Belum ada ulasan di filter ini.</div>
      )}

      <div className="space-y-3">
        {items.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold">
                {r.buyer.fullName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{r.buyer.fullName}</p>
                <p className="text-xs text-gray-500">{timeAgo(r.createdAt)}</p>
              </div>
              <span className="text-yellow-500 text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
            </div>
            {r.product && (
              <p className="text-xs text-gray-500 mt-2">
                Untuk: <Link href={`/produk/${r.product.slug}`} className="text-primary hover:underline">{r.product.name}</Link>
              </p>
            )}
            {r.comment && <p className="text-sm mt-2 whitespace-pre-wrap">{r.comment}</p>}
            {r.imageUrls.length > 0 && (
              <div className="flex gap-2 mt-2">
                {r.imageUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="w-16 h-16 rounded object-cover" />
                ))}
              </div>
            )}
            {r.sellerReply ? (
              <div className="mt-3 bg-gray-50 px-3 py-2 rounded text-sm">
                <p className="text-xs text-gray-500">Balasanmu · {timeAgo(r.sellerRepliedAt!)}</p>
                <p className="mt-1 whitespace-pre-wrap">{r.sellerReply}</p>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Tulis balasan (1× saja, tidak bisa diedit)"
                  value={replyDraft[r.id] ?? ''}
                  onChange={(e) => setReplyDraft((p) => ({ ...p, [r.id]: e.target.value }))}
                  maxLength={500}
                />
                <button
                  onClick={() => handleReply(r.id)}
                  disabled={busyId === r.id}
                  className="btn-primary text-sm"
                >Balas</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
