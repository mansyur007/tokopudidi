'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Icon } from './Icon';
import {
  getSuggestions,
  getSearchHistory,
  addSearchHistory,
  removeSearchHistory,
  type SuggestResult,
  type SearchHistoryItem,
} from '@/lib/api/search';

const EMPTY: SuggestResult = { products: [], categories: [], shops: [] };

export function SearchBar() {
  const router = useRouter();
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestResult>(EMPTY);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce 250ms, fetch saat q.length >= 2.
  useEffect(() => {
    if (q.trim().length < 2) { setSuggestions(EMPTY); return; }
    const t = setTimeout(() => {
      getSuggestions(q.trim()).then(setSuggestions).catch(() => setSuggestions(EMPTY));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function loadHistory() {
    if (token) getSearchHistory(token).then(setHistory).catch(() => setHistory([]));
  }

  function go(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (token) addSearchHistory(token, trimmed).catch(() => undefined);
    setOpen(false);
    inputRef.current?.blur();
    router.push(`/cari?q=${encodeURIComponent(trimmed)}`);
  }

  async function removeHistoryItem(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return;
    setHistory((h) => h.filter((it) => it.id !== id));
    await removeSearchHistory(token, id).catch(() => undefined);
  }

  const showHistory = q.trim().length === 0 && history.length > 0;
  const hasSuggestions = suggestions.products.length + suggestions.categories.length + suggestions.shops.length > 0;

  return (
    <div className="search-box relative">
      <form
        action="/cari"
        method="get"
        className="flex items-center gap-2 w-full"
        onSubmit={(e) => { e.preventDefault(); go(q); }}
      >
        <Icon name="search" size={18} className="text-ink-muted" />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { setOpen(true); loadHistory(); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); } }}
          placeholder="Cari di Tokopudidi"
          aria-label="Cari produk"
          autoComplete="off"
        />
      </form>

      {open && (showHistory || hasSuggestions) && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white border border-line rounded-[10px] shadow-toast z-50 max-h-[70vh] overflow-y-auto py-1.5 text-sm">
          {showHistory && (
            <div className="px-3 py-1.5">
              <p className="text-[11px] font-semibold text-ink-muted mb-1">Riwayat Pencarian</p>
              {history.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(h.query)}
                  className="w-full flex items-center justify-between gap-2 px-1.5 py-1.5 rounded-md hover:bg-page text-left"
                >
                  <span className="flex items-center gap-2 text-ink truncate">
                    <Icon name="search" size={13} className="text-ink-muted shrink-0" />
                    {h.query}
                  </span>
                  <span
                    role="button"
                    tabIndex={-1}
                    onMouseDown={(e) => removeHistoryItem(e, h.id)}
                    className="text-ink-muted hover:text-ink shrink-0"
                    aria-label={`Hapus riwayat ${h.query}`}
                  >
                    ✕
                  </span>
                </button>
              ))}
            </div>
          )}

          {suggestions.products.length > 0 && (
            <div className="px-3 py-1.5 border-t border-line first:border-t-0">
              <p className="text-[11px] font-semibold text-ink-muted mb-1">Produk</p>
              {suggestions.products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setOpen(false); if (token) addSearchHistory(token, q.trim()).catch(() => undefined); router.push(`/produk/${p.slug}`); }}
                  className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-page text-left text-ink truncate"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {suggestions.categories.length > 0 && (
            <div className="px-3 py-1.5 border-t border-line">
              <p className="text-[11px] font-semibold text-ink-muted mb-1">Kategori</p>
              {suggestions.categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setOpen(false); router.push(`/kategori/${c.slug}`); }}
                  className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-page text-left text-ink truncate"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {suggestions.shops.length > 0 && (
            <div className="px-3 py-1.5 border-t border-line">
              <p className="text-[11px] font-semibold text-ink-muted mb-1">Toko</p>
              {suggestions.shops.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setOpen(false); router.push(`/toko/${s.slug}`); }}
                  className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-page text-left text-ink truncate"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
