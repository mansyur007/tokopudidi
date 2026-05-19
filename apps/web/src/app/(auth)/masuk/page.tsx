'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@tokopudidi/shared';
import { apiLogin } from '@/lib/api/auth';
import { ApiClientError } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';

export default function MasukPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setSubmitError(null);
    setLoading(true);
    try {
      const result = await apiLogin(data.phone, data.password);
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
      <h1 className="text-xl font-bold mb-1">Selamat datang lagi!</h1>
      <p className="text-sm text-gray-600 mb-5">Masuk ke akun Tokopudidi kamu</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            {...register('password')}
          />
          {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
            {submitError}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Sebentar ya...' : 'Masuk'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm space-y-2">
        <Link href="/lupa-password" className="text-primary hover:underline">
          Lupa password?
        </Link>
        <p className="text-gray-600">
          Belum punya akun?{' '}
          <Link href="/daftar" className="text-primary font-medium hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
