'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { upgradeToSellerSchema, type UpgradeToSellerInput } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import { upgradeToSeller } from '@/lib/api/seller';
import { ApiClientError, apiFetch } from '@/lib/api/client';
import type { AuthTokens } from '@tokopudidi/shared';

export default function DaftarSellerPage() {
  const router = useRouter();
  const { user, tokens, setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ktpDataUrl, setKtpDataUrl] = useState<string>('');

  const {
    register, handleSubmit, formState: { errors }, setValue,
  } = useForm<UpgradeToSellerInput>({
    resolver: zodResolver(upgradeToSellerSchema),
    defaultValues: { agreeTerms: false },
  });

  function handleKtpFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Ukuran foto KTP maksimal 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setKtpDataUrl(url);
      setValue('ktpUrl', url, { shouldValidate: true });
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: UpgradeToSellerInput) {
    if (!tokens?.accessToken || !user) return;
    setBusy(true); setError(null);
    try {
      await upgradeToSeller(tokens.accessToken, data);
      // Refresh token agar dapat access token baru dengan role SELLER.
      const newTokens = await apiFetch<AuthTokens>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      setAuth({ ...user, role: 'SELLER' }, newTokens);
      router.push('/seller');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal daftar toko');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 py-6 max-w-xl mx-auto">
      <Link href="/akun" className="text-sm text-primary">← Kembali</Link>
      <h1 className="text-xl font-semibold mt-2 mb-1">Daftar Buka Toko</h1>
      <p className="text-sm text-gray-600 mb-5">
        Cuma butuh nama toko, lokasi, dan foto KTP. Verifikasi KTP-nya dilakukan tim Tokopudidi paling lama 2 hari kerja.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-4 space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="shopName">Nama Toko</label>
          <input id="shopName" className="input" {...register('shopName')} placeholder="Misal: Warung Bu Siti" />
          {errors.shopName && <p className="text-sm text-red-600 mt-1">{errors.shopName.message}</p>}
          <p className="text-xs text-gray-500 mt-1">URL toko: tokopudidi.com/toko/[otomatis-dari-nama]</p>
        </div>
        <div>
          <label className="label" htmlFor="shopDescription">Deskripsi Singkat (opsional)</label>
          <textarea id="shopDescription" className="input min-h-[80px]" {...register('shopDescription')} maxLength={500} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Provinsi</label>
            <select className="input" {...register('province')}>
              <option value="">Pilih</option>
              <option>DKI Jakarta</option>
              <option>Jawa Barat</option>
              <option>Banten</option>
              <option>Jawa Tengah</option>
              <option>Jawa Timur</option>
              <option>DI Yogyakarta</option>
              <option>Sumatera Utara</option>
              <option>Sumatera Barat</option>
              <option>Sumatera Selatan</option>
              <option>Kalimantan Timur</option>
              <option>Sulawesi Selatan</option>
              <option>Bali</option>
            </select>
            {errors.province && <p className="text-sm text-red-600 mt-1">{errors.province.message}</p>}
          </div>
          <div>
            <label className="label">Kota</label>
            <input className="input" {...register('city')} />
            {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>}
          </div>
        </div>
        <div>
          <label className="label">Foto KTP (JPG/PNG, max 2MB)</label>
          <input type="file" accept="image/jpeg,image/png" onChange={handleKtpFile} />
          {ktpDataUrl && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ktpDataUrl} alt="Preview KTP" className="max-h-40 rounded border" />
            </div>
          )}
          {errors.ktpUrl && <p className="text-sm text-red-600 mt-1">{errors.ktpUrl.message}</p>}
          <p className="text-xs text-gray-500 mt-1">
            Foto KTP cuma dipakai untuk verifikasi, tidak akan dipublikasikan.
          </p>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" {...register('agreeTerms')} className="mt-1 w-5 h-5" />
          <span>
            Saya menyetujui{' '}
            <Link href="/syarat" className="text-primary hover:underline">Syarat & Ketentuan Penjual</Link>
            {' '}dan menjamin produk yang saya jual asli & legal.
          </span>
        </label>
        {errors.agreeTerms && <p className="text-sm text-red-600">{errors.agreeTerms.message}</p>}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}

        <button disabled={busy} className="btn-primary w-full">
          {busy ? 'Mendaftarkan...' : 'Daftar Sekarang'}
        </button>
      </form>
    </div>
  );
}
