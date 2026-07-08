'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { listAddresses, type Address } from '@/lib/api/addresses';
import { getShippingQuote, getShippingOptions } from '@/lib/api/shipping';
import { validatePromo, type PromoApplied } from '@/lib/api/promo';
import { checkoutOrder } from '@/lib/api/orders';
import type { CartGroup } from '@/lib/api/cart';
import { ApiClientError } from '@/lib/api/client';
import { VoucherPicker } from '@/components/checkout/VoucherPicker';

type ShippingMethod = 'REGULAR' | 'SAME_DAY' | 'PICKUP_SENDIRI';
type PaymentMethod = 'COD' | 'TRANSFER_MANUAL' | 'QRIS_MOCK';

const SHIPPING_LABELS: Record<ShippingMethod, string> = {
  REGULAR: 'Reguler (2-4 hari)',
  SAME_DAY: 'Same Day (Jabodetabek)',
  PICKUP_SENDIRI: 'Ambil Sendiri',
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  COD: 'Bayar di Tempat (COD)',
  TRANSFER_MANUAL: 'Transfer Bank (BCA / BRI / Mandiri / BNI)',
  QRIS_MOCK: 'QRIS (otomatis lunas dalam 30 detik)',
};

interface PerShopState {
  shippingMethod: ShippingMethod;
  shippingCost: number;
  notes: string;
  weightGr: number;
  subtotal: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, tokens } = useAuthStore();
  const { data, refresh } = useCartStore();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [perShop, setPerShop] = useState<Record<string, PerShopState>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS_MOCK');
  const [codAvailable, setCodAvailable] = useState(false);
  const [sameDayAvailable, setSameDayAvailable] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<PromoApplied | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Init: redirect kalau belum login, load alamat & cart.
  useEffect(() => {
    if (!user) { router.push('/masuk'); return; }
    const stored = sessionStorage.getItem('checkout-items');
    if (stored) {
      try { setSelectedIds(new Set(JSON.parse(stored))); } catch {}
    }
    refresh();
  }, [user, router, refresh]);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    listAddresses(tokens.accessToken).then((a) => {
      setAddresses(a);
      const def = a.find((x) => x.isDefault);
      if (def) setAddressId(def.id);
      else if (a.length > 0) setAddressId(a[0].id);
    });
  }, [tokens?.accessToken]);

  // Filter cart group ke item yang dipilih saja.
  const groups: CartGroup[] = useMemo(() => {
    if (!data) return [];
    return data.grouped
      .map((g) => ({
        shop: g.shop,
        items: g.items.filter((it) => selectedIds.has(it.id)),
      }))
      .filter((g) => g.items.length > 0);
  }, [data, selectedIds]);

  // Init perShop default tiap kali groups berubah.
  useEffect(() => {
    setPerShop((prev) => {
      const next: Record<string, PerShopState> = { ...prev };
      for (const g of groups) {
        if (!next[g.shop.id]) {
          const subtotal = g.items.reduce((s, it) => s + it.subtotal, 0);
          const weightGr = g.items.reduce((s, it) => s + it.product.weight * it.quantity, 0);
          next[g.shop.id] = {
            shippingMethod: 'REGULAR',
            shippingCost: 0,
            notes: '',
            weightGr,
            subtotal,
          };
        }
      }
      return next;
    });
  }, [groups]);

  // Cek opsi shipping & COD ketika alamat berubah.
  useEffect(() => {
    if (!tokens?.accessToken || !addressId) return;
    const addr = addresses.find((a) => a.id === addressId);
    if (!addr) return;
    getShippingOptions(tokens.accessToken, addr.province).then((opt) => {
      setSameDayAvailable(opt.sameDayAvailable);
      setCodAvailable(opt.codAvailable);
      // Reset SAME_DAY ke REGULAR kalau tidak tersedia.
      if (!opt.sameDayAvailable) {
        setPerShop((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(next)) {
            if (next[k].shippingMethod === 'SAME_DAY') {
              next[k] = { ...next[k], shippingMethod: 'REGULAR', shippingCost: 0 };
            }
          }
          return next;
        });
      }
      if (!opt.codAvailable && paymentMethod === 'COD') setPaymentMethod('QRIS_MOCK');
    });
  }, [addressId, addresses, tokens?.accessToken, paymentMethod]);

  // Hitung ongkir tiap kali shippingMethod / address berubah.
  useEffect(() => {
    if (!tokens?.accessToken) return;
    const addr = addresses.find((a) => a.id === addressId);
    if (!addr) return;
    for (const g of groups) {
      const ps = perShop[g.shop.id];
      if (!ps) continue;
      if (ps.shippingMethod === 'PICKUP_SENDIRI') {
        if (ps.shippingCost !== 0) {
          setPerShop((prev) => ({ ...prev, [g.shop.id]: { ...prev[g.shop.id], shippingCost: 0 } }));
        }
        continue;
      }
      getShippingQuote(tokens.accessToken, {
        province: addr.province,
        weightGr: ps.weightGr,
        method: ps.shippingMethod,
      })
        .then((q) => {
          setPerShop((prev) => ({ ...prev, [g.shop.id]: { ...prev[g.shop.id], shippingCost: q.cost } }));
        })
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.map((g) => g.shop.id + perShop[g.shop.id]?.shippingMethod).join(','), addressId, addresses]);

  const totalSubtotal = groups.reduce((s, g) => s + (perShop[g.shop.id]?.subtotal ?? 0), 0);
  const totalShipping = groups.reduce((s, g) => s + (perShop[g.shop.id]?.shippingCost ?? 0), 0);
  const discount = promoApplied?.discountAmount ?? 0;
  const grandTotal = Math.max(0, totalSubtotal + totalShipping - discount);

  const allPickup = groups.length > 0 && groups.every((g) => perShop[g.shop.id]?.shippingMethod === 'PICKUP_SENDIRI');
  const needsAddress = !allPickup;

  // Voucher toko hanya relevan kalau checkout berisi tepat 1 toko (M9-B2).
  const singleShopId = groups.length === 1 ? groups[0].shop.id : undefined;

  async function applyPromo() {
    if (!tokens?.accessToken || !promoCode.trim()) return;
    setPromoError(null);
    try {
      const result = await validatePromo(tokens.accessToken, promoCode.trim().toUpperCase(), totalSubtotal, singleShopId);
      setPromoApplied(result);
    } catch (err) {
      setPromoApplied(null);
      setPromoError(err instanceof ApiClientError ? err.message : 'Kode promo tidak valid');
    }
  }

  // Dipakai VoucherPicker (M9-A4) — validasi server-side lalu apply; throw kalau gagal.
  async function applyVoucherCode(code: string) {
    if (!tokens?.accessToken) return;
    const result = await validatePromo(tokens.accessToken, code, totalSubtotal, singleShopId);
    setPromoApplied(result);
    setPromoError(null);
  }

  async function handleSubmit() {
    if (!tokens?.accessToken) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await checkoutOrder(tokens.accessToken, {
        addressId: needsAddress ? addressId ?? undefined : undefined,
        paymentMethod,
        promoCode: promoApplied?.code,
        shops: groups.map((g) => ({
          shopId: g.shop.id,
          cartItemIds: g.items.map((it) => it.id),
          shippingMethod: perShop[g.shop.id]?.shippingMethod ?? 'REGULAR',
          notes: perShop[g.shop.id]?.notes,
        })),
      });

      sessionStorage.removeItem('checkout-items');
      await refresh();

      // Kalau hanya 1 order → langsung ke detail. Kalau lebih → list pesanan.
      if (result.orders.length === 1) {
        router.push(`/pesanan/${result.orders[0].id}`);
      } else {
        router.push('/pesanan');
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal buat pesanan');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  if (groups.length === 0) {
    return (
      <div className="px-4 py-8 max-w-3xl mx-auto text-center">
        <p className="mb-3 text-gray-600">Belum ada item yang dipilih untuk checkout.</p>
        <Link href="/keranjang" className="btn-primary">Kembali ke Keranjang</Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-32 space-y-3">
      <h1 className="text-lg font-semibold mb-1">Checkout</h1>

      {/* Step 1: Alamat */}
      {needsAddress && (
        <section className="card p-4">
          <h2 className="font-semibold mb-2">📍 Alamat Pengiriman</h2>
          {addresses.length === 0 ? (
            <div className="text-sm">
              <p className="text-gray-600 mb-2">Belum ada alamat tersimpan.</p>
              <Link href="/akun/alamat" className="btn-primary text-sm inline-flex">
                + Tambah Alamat
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`block border rounded p-3 cursor-pointer ${
                    addressId === a.id ? 'border-primary bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    className="mr-2"
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                  />
                  <span className="font-medium">{a.label}</span> — {a.recipientName} ({a.recipientPhone})
                  <p className="text-sm text-gray-600 mt-1">
                    {a.fullAddress}, {a.subdistrict}, {a.district}, {a.city}, {a.province} {a.postalCode}
                  </p>
                </label>
              ))}
              <Link href="/akun/alamat" className="text-sm text-primary hover:underline">+ Kelola alamat</Link>
            </div>
          )}
        </section>
      )}

      {/* Step 2: Per toko — kurir + catatan */}
      {groups.map((g) => {
        const ps = perShop[g.shop.id];
        if (!ps) return null;
        return (
          <section key={g.shop.id} className="card p-4 space-y-3">
            <h2 className="font-semibold">🏪 {g.shop.name}</h2>
            <div className="space-y-1.5">
              {g.items.map((it) => (
                <div key={it.id} className="flex gap-3 text-sm">
                  <div className="relative w-12 h-12 rounded bg-gray-100 overflow-hidden shrink-0">
                    {it.product.imageUrl && (
                      <Image src={it.product.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-1">{it.product.name}</p>
                    {it.variant && <p className="text-xs text-gray-500">Varian: {it.variant.name}</p>}
                    <p className="text-xs text-gray-500">{it.quantity} × {formatRupiah(it.price)}</p>
                  </div>
                  <p className="font-medium">{formatRupiah(it.subtotal)}</p>
                </div>
              ))}
            </div>

            <div>
              <label className="label">Pilih Kurir</label>
              <select
                className="input"
                value={ps.shippingMethod}
                onChange={(e) =>
                  setPerShop((prev) => ({
                    ...prev,
                    [g.shop.id]: { ...prev[g.shop.id], shippingMethod: e.target.value as ShippingMethod, shippingCost: 0 },
                  }))
                }
              >
                <option value="REGULAR">{SHIPPING_LABELS.REGULAR}</option>
                {sameDayAvailable && <option value="SAME_DAY">{SHIPPING_LABELS.SAME_DAY}</option>}
                <option value="PICKUP_SENDIRI">{SHIPPING_LABELS.PICKUP_SENDIRI}</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Berat total {ps.weightGr}gr · Ongkir{' '}
                <span className="font-medium">
                  {ps.shippingMethod === 'PICKUP_SENDIRI' ? 'Gratis' : formatRupiah(ps.shippingCost)}
                </span>
              </p>
            </div>

            <div>
              <label className="label">Catatan untuk Penjual (opsional, max 200 char)</label>
              <textarea
                className="input min-h-[60px]"
                maxLength={200}
                placeholder="Contoh: tolong bungkus rapi ya"
                value={ps.notes}
                onChange={(e) =>
                  setPerShop((prev) => ({ ...prev, [g.shop.id]: { ...prev[g.shop.id], notes: e.target.value } }))
                }
              />
            </div>
          </section>
        );
      })}

      {/* Step 4: Promo / Voucher */}
      <section className="card p-4">
        <h2 className="font-semibold mb-2">🎟️ Voucher & Kode Promo</h2>
        {promoApplied ? (
          <div className="flex items-center justify-between gap-2 bg-primary-50 px-3 py-2 rounded">
            <div>
              <p className="text-sm font-medium text-primary">{promoApplied.code} terpakai</p>
              <p className="text-xs text-primary">Hemat {formatRupiah(promoApplied.discountAmount)}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setPickerOpen(true)} className="text-xs text-primary">Ganti</button>
              <button onClick={() => setPromoApplied(null)} className="text-xs text-red-600">Hapus</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <button onClick={() => setPickerOpen(true)} className="btn-outline w-full text-primary font-semibold">
              🎟️ Pakai Voucher
            </button>
            <div className="flex gap-2">
              <input
                className="input flex-1 uppercase"
                placeholder="Atau masukkan kode promo manual"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              />
              <button onClick={applyPromo} className="btn-outline">Pakai</button>
            </div>
          </div>
        )}
        {promoError && <p className="text-xs text-red-600 mt-1">{promoError}</p>}
        {pickerOpen && (
          <VoucherPicker
            subtotal={totalSubtotal}
            shopId={singleShopId}
            currentCode={promoApplied?.code ?? null}
            onApply={applyVoucherCode}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </section>

      {/* Step 5: Metode bayar */}
      <section className="card p-4">
        <h2 className="font-semibold mb-2">💳 Metode Pembayaran</h2>
        <div className="space-y-2">
          {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => {
            const disabled = m === 'COD' && !codAvailable;
            return (
              <label
                key={m}
                className={`flex items-center gap-2 border rounded p-3 cursor-pointer text-sm ${
                  paymentMethod === m ? 'border-primary bg-primary-50' : 'border-gray-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="payment"
                  disabled={disabled}
                  checked={paymentMethod === m}
                  onChange={() => setPaymentMethod(m)}
                />
                <span>{PAYMENT_LABELS[m]}</span>
                {disabled && <span className="ml-auto text-xs text-orange-600">tidak tersedia di area</span>}
              </label>
            );
          })}
        </div>
      </section>

      {/* Ringkasan */}
      <section className="card p-4 space-y-1 text-sm">
        <h2 className="font-semibold mb-2">Ringkasan</h2>
        <div className="flex justify-between"><span>Subtotal Produk</span><span>{formatRupiah(totalSubtotal)}</span></div>
        <div className="flex justify-between"><span>Total Ongkir</span><span>{formatRupiah(totalShipping)}</span></div>
        {discount > 0 && (
          <div className="flex justify-between text-primary"><span>Diskon Promo</span><span>−{formatRupiah(discount)}</span></div>
        )}
        <hr className="my-2" />
        <div className="flex justify-between font-semibold text-base">
          <span>Total Bayar</span>
          <span className="text-primary">{formatRupiah(grandTotal)}</span>
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>
      )}

      <div className="fixed bottom-16 md:bottom-0 inset-x-0 bg-white border-t z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 text-right">
            <p className="text-xs text-gray-500">Total Bayar</p>
            <p className="font-bold text-primary">{formatRupiah(grandTotal)}</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || (needsAddress && !addressId) || groups.length === 0}
            className="btn-primary"
          >
            {submitting ? 'Memproses...' : 'Bayar Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
}
