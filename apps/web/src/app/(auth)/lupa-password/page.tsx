'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiSendOtp } from '@/lib/api/auth';
import { apiFetch, ApiClientError } from '@/lib/api/client';

export default function LupaPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiSendOtp(phone, 'RESET_PASSWORD');
      setStep('verify');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal kirim OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ phone, code, newPassword }),
      });
      router.push('/masuk');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold mb-1">Lupa password?</h1>
      <p className="text-sm text-gray-600 mb-5">
        {step === 'phone'
          ? 'Masukkan nomor HP-mu, kami kirim kode OTP-nya.'
          : `Kami sudah kirim kode ke ${phone}. Cek SMS atau console (di mode dev).`}
      </p>

      {step === 'phone' ? (
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="label" htmlFor="phone">Nomor HP</label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081234567890"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="btn-primary w-full">
            {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="label" htmlFor="code">Kode OTP (6 digit)</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="input tracking-widest text-center text-lg"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="np">Password Baru</label>
            <input
              id="np"
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="btn-primary w-full">
            {loading ? 'Sebentar...' : 'Ganti Password'}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm">
        <Link href="/masuk" className="text-primary hover:underline">
          Kembali ke halaman masuk
        </Link>
      </p>
    </div>
  );
}
