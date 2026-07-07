'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { timeAgo } from '@tokopudidi/shared';
import { listProductReviews, type ReviewItem } from '@/lib/api/reviews';
import { Icon } from '@/components/shell/Icon';
import { ReportButton } from '@/components/report/ReportButton';

interface Props {
  productId: string;
  ratingAvg: number;
  ratingCount: number;
}

const RATING_OPTIONS = [5, 4, 3, 2, 1] as const;
const TOPICS = ['Kualitas Barang', 'Pelayanan Penjual', 'Pengiriman'];

function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon key={i} name="star" size={size} className={i < value ? 'text-star' : 'text-line-dark'} />
      ))}
    </span>
  );
}

function CheckRow({ label, on, onToggle }: { label: React.ReactNode; on: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center gap-2 text-[12.5px] text-ink-soft py-1 cursor-pointer select-none">
      <span
        className={clsx(
          'w-4 h-4 rounded grid place-items-center text-white',
          on ? 'bg-primary' : 'bg-white border-[1.5px] border-line-dark',
        )}
      >
        {on && <Icon name="check" size={11} stroke={3} />}
      </span>
      <input type="checkbox" checked={on} onChange={onToggle} className="sr-only" />
      <span>{label}</span>
    </label>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-3">
      <div className="flex justify-between items-center font-bold text-[12.5px] mb-2 text-ink">
        {title}
        <Icon name="chevron-down" size={14} />
      </div>
      {children}
    </div>
  );
}

export function ProductReviews({ productId, ratingAvg, ratingCount }: Props) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterRating, setFilterRating] = useState<number | undefined>(undefined);
  const [filterWithImage, setFilterWithImage] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sampel review (tanpa filter) untuk hitung distribusi bintang.
  const [sample, setSample] = useState<ReviewItem[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listProductReviews(productId, {
        rating: filterRating,
        withImage: filterWithImage || undefined,
        page,
      });
      setItems(r.items); setTotal(r.total);
    } catch {
      setItems([]); setTotal(0);
    } finally { setLoading(false); }
  }, [productId, filterRating, filterWithImage, page]);

  useEffect(() => { refresh(); }, [refresh]);

  // Sampel sekali — untuk distribusi bintang & galeri foto pembeli.
  useEffect(() => {
    listProductReviews(productId, { page: 1 })
      .then((r) => setSample(r.items))
      .catch(() => setSample([]));
  }, [productId]);

  const distribution = useMemo(() => {
    const buckets: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of sample) buckets[r.rating] = (buckets[r.rating] ?? 0) + 1;
    return buckets;
  }, [sample]);
  const distMax = Math.max(1, ...Object.values(distribution));

  const buyerPhotos = useMemo(() => {
    const photos: string[] = [];
    for (const r of sample) for (const u of r.imageUrls ?? []) photos.push(u);
    return photos;
  }, [sample]);
  const photoTiles = buyerPhotos.slice(0, 5);
  const extraPhotos = Math.max(0, buyerPhotos.length - photoTiles.length);

  const totalPages = Math.max(1, Math.ceil(total / 10));
  const pctSatisfied = ratingAvg > 0 ? Math.round((ratingAvg / 5) * 100) : 0;

  function changePage(n: number) {
    if (n < 1 || n > totalPages) return;
    setPage(n);
  }

  return (
    <section className="mt-10">
      <h2 className="text-[16px] font-extrabold tracking-wide uppercase text-ink-soft mb-4">Ulasan Pembeli</h2>

      {/* Breakdown card */}
      <div className="bg-white border border-line rounded-card p-5">
        <div className="flex gap-9 items-center flex-wrap">
          <div className="flex items-center gap-3.5">
            <Icon name="star" size={40} className="text-star" />
            <div>
              <div className="text-[30px] font-extrabold leading-none">
                {ratingAvg.toFixed(1)}
                <span className="text-base text-ink-muted font-semibold"> / 5.0</span>
              </div>
              <div className="text-xs text-ink-muted mt-1">{pctSatisfied}% pembeli merasa puas</div>
              <div className="text-xs text-ink-muted">{ratingCount} rating · {total} ulasan</div>
            </div>
          </div>
          <div className="flex-1 min-w-[220px] grid gap-1.5">
            {RATING_OPTIONS.map((s) => (
              <div key={s} className="flex items-center gap-2 text-xs">
                <Icon name="star" size={12} className="text-star" />
                <span className="w-2">{s}</span>
                <div className="flex-1 h-[7px] rounded bg-page overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${((distribution[s] ?? 0) / distMax) * 100}%` }}
                  />
                </div>
                <span className="w-7 text-right text-ink-muted">{distribution[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter + List */}
      <div className="flex flex-col md:flex-row gap-6 mt-5 items-start">
        {/* Sidebar filter */}
        <aside className="w-full md:w-[200px] shrink-0">
          <div className="font-extrabold text-xs tracking-wider text-ink-soft mb-1">FILTER ULASAN</div>
          <FilterGroup title="Media">
            <CheckRow
              label="Dengan Foto & Video"
              on={filterWithImage}
              onToggle={() => { setFilterWithImage((x) => !x); setPage(1); }}
            />
          </FilterGroup>
          <FilterGroup title="Rating">
            {RATING_OPTIONS.map((s) => (
              <CheckRow
                key={s}
                label={
                  <span className="flex items-center gap-1">
                    <Icon name="star" size={12} className="text-star" /> {s}
                  </span>
                }
                on={filterRating === s}
                onToggle={() => { setFilterRating((cur) => (cur === s ? undefined : s)); setPage(1); }}
              />
            ))}
          </FilterGroup>
          <FilterGroup title="Topik Ulasan">
            {TOPICS.map((t) => (
              <CheckRow key={t} label={t} on={false} onToggle={() => undefined} />
            ))}
          </FilterGroup>
        </aside>

        {/* Review list */}
        <div className="flex-1 min-w-0 w-full">
          {photoTiles.length > 0 && (
            <>
              <div className="font-bold text-[13px] mb-2.5">Foto &amp; Video Pembeli</div>
              <div className="flex gap-2 mb-5">
                {photoTiles.map((src, k) => (
                  <div key={k} className="relative w-16 h-16 rounded-md overflow-hidden border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    {k === photoTiles.length - 1 && extraPhotos > 0 && (
                      <div className="absolute inset-0 bg-black/50 text-white grid place-items-center font-bold">
                        +{extraPhotos}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center mb-1">
            <div className="font-bold text-[13px]">
              Ulasan Pilihan{' '}
              <span className="text-ink-muted font-medium">
                · Menampilkan {Math.min(items.length, total)} dari {total} ulasan
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs">
              Urutkan
              <button className="ghost-btn flex items-center gap-1 border border-line px-2.5 py-1 rounded-md">
                Paling Membantu <Icon name="chevron-down" size={13} />
              </button>
            </div>
          </div>

          {loading && <p className="text-sm text-ink-muted py-4">Memuat ulasan…</p>}

          {!loading && items.length === 0 && (
            <p className="text-sm text-ink-muted py-6 text-center">Belum ada ulasan untuk filter ini.</p>
          )}

          <div>
            {items.map((r) => (
              <article key={r.id} className="py-4 border-b border-line">
                <div className="flex items-center gap-2 mb-1.5">
                  <Stars value={r.rating} />
                  <span className="text-[11.5px] text-ink-muted ml-2">{timeAgo(r.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-7 h-7 rounded-full bg-page border border-line grid place-items-center text-xs font-bold text-ink-soft">
                    {r.buyer.fullName.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-bold text-[13px]">{r.buyer.fullName}</span>
                </div>
                {r.comment && (
                  <p className="m-0 mb-2 text-[13px] text-ink-soft leading-[1.6] whitespace-pre-wrap">{r.comment}</p>
                )}
                {r.imageUrls.length > 0 && (
                  <div className="flex gap-1.5 mb-2">
                    {r.imageUrls.map((u, i) => (
                      <div key={i} className="w-[52px] h-[52px] rounded-lg overflow-hidden border border-line">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                {r.sellerReply && (
                  <div className="bg-page rounded-md px-3 py-2 mt-2 text-[13px]">
                    <p className="text-[11px] text-ink-muted">
                      Balasan Penjual{r.sellerRepliedAt ? ` · ${timeAgo(r.sellerRepliedAt)}` : ''}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap">{r.sellerReply}</p>
                  </div>
                )}
                <div className="flex items-center gap-3.5 text-xs text-ink-muted mt-2">
                  <button className="ghost-btn flex items-center gap-1.5">
                    <Icon name="heart" size={14} /> Membantu
                  </button>
                  <ReportButton targetType="REVIEW" targetId={r.id} compact />
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {Array.from({ length: Math.min(totalPages, 3) }).map((_, i) => {
                const n = i + 1;
                const active = n === page;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => changePage(n)}
                    className={clsx(
                      'w-8 h-8 rounded-md border font-bold text-[13px]',
                      active
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-ink-soft border-line',
                    )}
                  >
                    {n}
                  </button>
                );
              })}
              {totalPages > 3 && (
                <button
                  type="button"
                  onClick={() => changePage(page + 1)}
                  className="ml-3 text-primary font-bold text-[13px]"
                >
                  Lihat Semua Ulasan
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
