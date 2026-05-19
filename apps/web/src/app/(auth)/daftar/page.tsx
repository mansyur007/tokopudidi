'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@tokopudidi/shared';
import { apiRegister } from '@/lib/api/auth';
import { ApiClientError } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';

export default function DaftarPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { referralCode: '' },
  });

  async function onSubmit(data: RegisterInput) {
    setSubmitError(null);
    setLoading(true);
    try {
      const result = await apiRegister({
        phone: data.phone,
        password: data.password,
        fullName: data.fullName,
        referralCode: data.referralCode || undefined,
      });
      setAuth(result.user, result.tokens);
      router.push('/');
    } catch (err) {
      if (err instanceof ApiClientError) setSubmitError(err.message);
      else setSubmitError('Yah, ada masalah. Coba lagi ya?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold mb-1">Bikin akun baru</h1>
      <p className="text-sm text-gray-600 mb-5">Gratis, cuma butuh nomor HP</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="fullName" className="label">Nama Lengkap</label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Budi Santoso"
            className="input"
            {...register('fullName')}
          />
          {errors.fullName && <p className="text-sm text-red-600 mt-1">{errors.fullName.message}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="label">Nomor HP</label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="081234567890"
            className="input"
            {...register('phone')}
          />
          {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>}
          <p className="text-xs text-gray-500 mt-1">Pastikan aktif WhatsApp ya</p>
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="input"
            {...register('password')}
          />
          {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
          <p className="text-xs text-gray-500 mt-1">Minimal 6 karakter</p>
        </div>

        <div>
          <label htmlFor="referralCode" className="label">Kode Referral <span className="text-gray-400 font-normal">(opsional)</span></label>
          <input
            id="referralCode"
            type="text"
            placeholder="ABCD1234"
            className="input uppercase"
            maxLength={8}
            {...register('referralCode')}
          />
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
            {submitError}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Sebentar ya...' : 'Daftar Sekarang'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Dengan mendaftar, kamu setuju dengan{' '}
          <Link href="/syarat" className="text-primary hover:underline">Syarat & Ketentuan</Link>
          {' '}kami.
        </p>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Sudah punya akun?{' '}
        <Link href="/masuk" className="text-primary font-medium hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
