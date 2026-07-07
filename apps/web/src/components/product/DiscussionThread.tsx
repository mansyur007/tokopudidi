'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { timeAgo, type DiscussionNode, type DiscussionReply, type DiscussionSort } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listDiscussions, askQuestion, replyDiscussion, toggleHelpful, deleteDiscussion,
} from '@/lib/api/discussions';
import { ApiClientError } from '@/lib/api/client';
import { ReportButton } from '@/components/report/ReportButton';

function SellerBadge() {
  return (
    <span className="text-[10px] font-bold text-white bg-primary rounded px-1.5 py-0.5 align-middle">
      Penjual
    </span>
  );
}

export function DiscussionThread({ productId }: { productId: string }) {
  const router = useRouter();
  const { user, tokens } = useAuthStore();
  const token = tokens?.accessToken;
  const isAdmin = user?.role === 'ADMIN';

  const [items, setItems] = useState<DiscussionNode[]>([]);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<DiscussionSort>('newest');
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listDiscussions(productId, { sort, token });
      setItems(r.items);
      setTotal(r.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [productId, sort, token]);

  useEffect(() => { refresh(); }, [refresh]);

  function requireLogin(): boolean {
    if (!token) {
      const back = typeof window !== 'undefined' ? window.location.pathname : '/';
      router.push(`/masuk?redirect=${encodeURIComponent(back)}`);
      return false;
    }
    return true;
  }

  async function submitQuestion() {
    if (!requireLogin() || !token) return;
    if (question.trim().length < 3) { setError('Pertanyaan minimal 3 karakter'); return; }
    setBusy(true); setError(null);
    try {
      await askQuestion(productId, question.trim(), token);
      setQuestion('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal mengirim pertanyaan');
    } finally { setBusy(false); }
  }

  async function submitReply(rootId: string) {
    if (!requireLogin() || !token) return;
    if (replyText.trim().length < 2) return;
    setBusy(true);
    try {
      await replyDiscussion(rootId, replyText.trim(), token);
      setReplyText(''); setReplyOpen(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal mengirim balasan');
    } finally { setBusy(false); }
  }

  async function onHelpful(id: string) {
    if (!requireLogin() || !token) return;
    // optimistic
    setItems((prev) => prev.map((root) => bumpHelpful(root, id)));
    try {
      await toggleHelpful(id, token);
    } catch {
      await refresh(); // rollback via reload
    }
  }

  async function onDelete(id: string) {
    if (!token) return;
    if (!confirm('Hapus diskusi ini?')) return;
    try {
      await deleteDiscussion(id, token);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal menghapus');
    }
  }

  function canDelete(d: DiscussionReply): boolean {
    return !d.isDeleted && (d.isMine || isAdmin);
  }

  function Row({ d, isReply }: { d: DiscussionReply; isReply?: boolean }) {
    return (
      <div className={clsx('py-3', isReply && 'pl-5 border-l-2 border-line ml-1')}>
        <div className="flex items-center gap-2 text-[13px]">
          <span className="font-semibold text-ink">{d.isDeleted ? '—' : d.userName}</span>
          {d.isSellerReply && !d.isDeleted && <SellerBadge />}
          <span className="text-ink-muted text-xs">· {timeAgo(d.createdAt)}</span>
        </div>
        <p className={clsx('text-[13.5px] mt-1 whitespace-pre-line', d.isDeleted ? 'text-ink-muted italic' : 'text-ink-soft')}>
          {d.isDeleted ? '[Pesan dihapus]' : d.message}
        </p>
        {!d.isDeleted && (
          <div className="flex items-center gap-4 mt-1.5 text-xs">
            <button
              type="button"
              onClick={() => onHelpful(d.id)}
              className={clsx('font-semibold', d.myHelpful ? 'text-primary' : 'text-ink-muted hover:text-primary')}
            >
              👍 Membantu{d.helpfulCount > 0 ? ` (${d.helpfulCount})` : ''}
            </button>
            {!isReply && (
              <button
                type="button"
                onClick={() => { setReplyOpen(replyOpen === d.id ? null : d.id); setReplyText(''); }}
                className="text-ink-muted hover:text-primary font-semibold"
              >
                Balas
              </button>
            )}
            {canDelete(d) && (
              <button type="button" onClick={() => onDelete(d.id)} className="text-ink-muted hover:text-red-600">
                Hapus
              </button>
            )}
            {!d.isMine && <ReportButton targetType="DISCUSSION" targetId={d.id} compact />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-ink text-[15px] m-0">Diskusi Produk ({total})</h3>
        <div className="flex gap-1 text-xs">
          {(['newest', 'helpful'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={clsx(
                'px-2.5 py-1 rounded-full font-semibold',
                sort === s ? 'bg-primary text-white' : 'bg-page text-ink-muted',
              )}
            >
              {s === 'newest' ? 'Terbaru' : 'Paling Membantu'}
            </button>
          ))}
        </div>
      </div>

      {/* Form tanya */}
      <div className="border border-line rounded-card p-3 mb-4">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={user ? 'Tulis pertanyaan untuk penjual…' : 'Login dulu untuk bertanya…'}
          rows={2}
          maxLength={500}
          className="w-full text-[13.5px] resize-none outline-none bg-transparent"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-ink-muted">{question.length}/500</span>
          <button
            type="button"
            onClick={submitQuestion}
            disabled={busy}
            className="btn-primary text-[13px] px-4 py-1.5 disabled:opacity-60"
          >
            {busy ? 'Mengirim…' : 'Kirim Pertanyaan'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

      {loading ? (
        <p className="text-ink-muted text-sm py-4 text-center">Memuat diskusi…</p>
      ) : items.length === 0 ? (
        <p className="text-ink-muted text-sm py-6 text-center">Belum ada diskusi. Jadilah yang pertama bertanya!</p>
      ) : (
        <div className="divide-y divide-line">
          {items.map((root) => (
            <div key={root.id} className="py-1">
              <Row d={root} />
              {root.replies.map((rep) => <Row key={rep.id} d={rep} isReply />)}
              {replyOpen === root.id && (
                <div className="pl-5 ml-1 pb-3 flex gap-2">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Tulis balasan…"
                    maxLength={500}
                    className="flex-1 border border-line rounded-lg px-3 py-1.5 text-[13px] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => submitReply(root.id)}
                    disabled={busy}
                    className="btn-primary text-[13px] px-3 py-1.5 disabled:opacity-60"
                  >
                    Kirim
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper optimistic toggle helpful pada 1 node (root + replies).
function bumpHelpful(root: DiscussionNode, id: string): DiscussionNode {
  const flip = (d: DiscussionReply): DiscussionReply =>
    d.id === id
      ? { ...d, myHelpful: !d.myHelpful, helpfulCount: d.helpfulCount + (d.myHelpful ? -1 : 1) }
      : d;
  return { ...flip(root), replies: root.replies.map(flip) };
}
