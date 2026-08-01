'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BROADCAST_BODY_MAX,
  BROADCAST_TITLE_MAX,
  broadcastCooldownRemainingMs,
  formatCooldownRemaining,
  formatTanggalWaktu,
} from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listSellerBroadcasts, createSellerBroadcast, listSellerProducts,
  type SellerBroadcastRow, type SellerBroadcastStatus, type SellerProductRow,
} from '@/lib/api/seller';
import { ApiClientError } from '@/lib/api/client';

export default function SellerBroadcastPage() {
  const { tokens } = useAuthStore();
  const [items, setItems] = useState<SellerBroadcastRow[]>([]);
  const [status, setStatus] = useState<SellerBroadcastStatus | null>(null);
  const [products, setProducts] = useState<SellerProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [productId, setProductId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Sisa jeda dihitung ulang tiap menit dari `lastSentAt`, bukan dihitung
  // mundur dari angka yang dikirim server: kalau halaman dibiarkan terbuka
  // semalaman, angka yang dibekukan saat load akan bohong.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      const res = await listSellerBroadcasts(tokens.accessToken);
      setItems(res.items);
      setStatus(res.status);
      setNow(new Date());
    } finally { setLoading(false); }
  }, [tokens?.accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  // Produk untuk picker — hanya dipakai sebagai tautan di notifikasi, jadi 50
  // teratas sudah cukup dan tidak perlu paginasi sendiri. `ACTIVE` (huruf besar,
  // sesuai filter di seller.product.routes) supaya broadcast tidak menautkan
  // follower ke produk yang sedang dinonaktifkan.
  useEffect(() => {
    if (!tokens?.accessToken) return;
    listSellerProducts(tokens.accessToken, { status: 'ACTIVE', limit: 50 })
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]));
  }, [tokens?.accessToken]);

  const cooldownMs = useMemo(
    () => broadcastCooldownRemainingMs(status?.lastSentAt ?? null, now),
    [status?.lastSentAt, now],
  );
  const noFollower = (status?.followerCount ?? 0) === 0;
  const blocked = cooldownMs > 0 || noFollower;

  async function handleSubmit() {
    if (!tokens?.accessToken) return;
    if (title.trim().length < 3) { setError('Judul minimal 3 karakter'); return; }
    if (body.trim().length < 10) { setError('Isi pengumuman minimal 10 karakter'); return; }

    setBusy(true); setError(null); setMsg(null);
    try {
      const sent = await createSellerBroadcast(tokens.accessToken, {
        title: title.trim(),
        body: body.trim(),
        productId: productId || null,
      });
      setMsg(`Pengumuman terkirim ke ${sent.recipientCount} follower.`);
      setTitle(''); setBody(''); setProductId('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal mengirim pengumuman');
      // Server bisa saja menolak karena jeda yang belum tercermin di layar
      // (mis. dikirim dari tab lain) — tarik status terbaru supaya tombolnya
      // ikut menyesuaikan, bukan cuma menampilkan pesan merah.
      await refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="px-4 md:px-6 py-4 space-y-3 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">📣 Broadcast Promo</h1>
        <p className="text-sm text-gray-500">
          Kirim pengumuman ke semua follower tokomu. Maksimal 1× per 24 jam.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      {!loading && status && (
        <>
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm">
                👥 <strong>{status.followerCount}</strong> follower akan menerima pengumuman ini
              </p>
              {cooldownMs > 0 && (
                <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700">
                  Bisa kirim lagi dalam {formatCooldownRemaining(cooldownMs)}
                </span>
              )}
            </div>

            {noFollower && (
              <p className="text-sm bg-gray-50 text-gray-600 rounded-lg px-3 py-2">
                Tokomu belum punya follower. Ajak pembeli menekan tombol <strong>Follow</strong> di
                halaman tokomu dulu ya.
              </p>
            )}

            <div>
              <p className="label">Judul</p>
              <input
                className="input w-full"
                placeholder="mis. Diskon Akhir Pekan 20%"
                maxLength={BROADCAST_TITLE_MAX}
                value={title}
                disabled={blocked}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-xs text-gray-400 text-right mt-0.5">
                {title.length}/{BROADCAST_TITLE_MAX}
              </p>
            </div>

            <div>
              <p className="label">Isi Pengumuman</p>
              <textarea
                className="input w-full min-h-[100px]"
                placeholder="Tulis promo atau kabar terbaru tokomu..."
                maxLength={BROADCAST_BODY_MAX}
                value={body}
                disabled={blocked}
                onChange={(e) => setBody(e.target.value)}
              />
              <p className="text-xs text-gray-400 text-right mt-0.5">
                {body.length}/{BROADCAST_BODY_MAX}
              </p>
            </div>

            <div>
              <p className="label">
                Sorot Produk <span className="text-gray-400">(opsional)</span>
              </p>
              <select
                className="input w-full"
                value={productId}
                disabled={blocked}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">Tanpa produk — tautkan ke halaman toko</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Notifikasi follower akan mengarah ke {productId ? 'halaman produk ini' : 'halaman tokomu'}.
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {msg && <p className="text-sm text-green-700">{msg}</p>}

            <button onClick={handleSubmit} disabled={busy || blocked} className="btn-primary w-full">
              {busy
                ? 'Mengirim...'
                : cooldownMs > 0
                  ? `Tunggu ${formatCooldownRemaining(cooldownMs)}`
                  : `Kirim ke ${status.followerCount} Follower`}
            </button>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-sm">Riwayat Broadcast</h2>
            {items.length === 0 && (
              <div className="card p-6 text-center text-sm text-gray-600">
                Belum ada pengumuman terkirim.
              </div>
            )}
            {items.map((b) => (
              <div key={b.id} className="card p-4 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{b.title}</p>
                  <span className="text-xs text-gray-500 shrink-0">{formatTanggalWaktu(b.sentAt)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-line">{b.body}</p>
                <p className="text-xs text-gray-500">
                  Terkirim ke {b.recipientCount} follower
                  {b.product && (
                    <>
                      {' · '}
                      <Link href={`/produk/${b.product.slug}`} className="text-primary hover:underline">
                        {b.product.name}
                      </Link>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
