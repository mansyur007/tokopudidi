'use client';

import { useEffect, useRef, useState } from 'react';
import { formatRupiah } from '@tokopudidi/shared';
import type { QrisPayment } from '@/lib/api/orders';
import { SmartImage } from '@/components/media/SmartImage';

/** Sisa waktu bayar dalam milidetik, dihitung ulang tiap detik. */
function useCountdown(expiresAt: string) {
  const [msLeft, setMsLeft] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  );
  useEffect(() => {
    const tick = () => setMsLeft(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  return msLeft;
}

function formatMmSs(ms: number) {
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

interface Props {
  qris: QrisPayment;
  paying: boolean;
  /** Simulasi bayar — menggantikan webhook PSP selama QRIS masih mock. */
  onPay: () => void;
  /** Dipanggil sekali saat hitungan mundur habis, supaya halaman memuat ulang status order. */
  onExpired: () => void;
}

export function QrisPanel({ qris, paying, onPay, onExpired }: Props) {
  const msLeft = useCountdown(qris.expiresAt);
  const expired = qris.expired || msLeft === 0;

  // Cukup sekali — tanpa guard, tiap tick setelah 00:00 akan memicu refetch.
  const notified = useRef(false);
  useEffect(() => {
    if (expired && !notified.current) {
      notified.current = true;
      onExpired();
    }
  }, [expired, onExpired]);

  if (expired) {
    return (
      <section className="card p-6 text-center space-y-2">
        <p className="text-3xl">⌛</p>
        <h2 className="font-semibold">Batas waktu pembayaran habis</h2>
        <p className="text-sm text-gray-600">
          Pesanan ini kedaluwarsa dan stoknya sudah dikembalikan. Kamu bisa pesan ulang kapan saja.
        </p>
      </section>
    );
  }

  const mendesak = msLeft < 3 * 60 * 1000;

  return (
    <section className="card p-4 space-y-3 text-center">
      <h2 className="font-semibold">📱 Scan QRIS untuk Bayar</h2>

      <div>
        <p className="text-xs text-gray-500">Bayar dalam</p>
        <p className={`text-2xl font-mono font-semibold ${mendesak ? 'text-red-600' : 'text-gray-900'}`}>
          {formatMmSs(msLeft)}
        </p>
      </div>

      {/*
        Data URI dari API. SmartImage mengenalinya sebagai `data` dan tetap
        merender <img> biasa — QR statis tidak perlu (dan tidak bisa) dioptimasi.
      */}
      <SmartImage
        src={qris.qrImageDataUrl}
        alt="Kode QR pembayaran"
        className="mx-auto w-56 h-56 rounded border bg-white p-2"
      />

      <p className="text-sm">
        Nominal <span className="font-semibold">{formatRupiah(qris.amount)}</span>
      </p>

      <p className="text-xs text-gray-500">
        QR ini <span className="font-medium">simulasi</span> — belum terhubung ke penyedia QRIS
        sungguhan, jadi tidak bisa di-scan aplikasi bank.
      </p>

      <button type="button" onClick={onPay} disabled={paying} className="btn-primary w-full">
        {paying ? 'Memproses...' : 'Saya sudah bayar (mock)'}
      </button>
    </section>
  );
}
