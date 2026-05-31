'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressInputSchema, type AddressInput } from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  type Address,
} from '@/lib/api/addresses';
import { ApiClientError } from '@/lib/api/client';

export default function AlamatPage() {
  const router = useRouter();
  const { user, tokens } = useAuthStore();
  const [items, setItems] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Address | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!user) router.push('/masuk');
  }, [user, router]);

  const refresh = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      setItems(await listAddresses(tokens.accessToken));
    } finally {
      setLoading(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleDelete(id: string) {
    if (!tokens?.accessToken) return;
    if (!confirm('Yakin hapus alamat ini?')) return;
    await deleteAddress(tokens.accessToken, id);
    await refresh();
  }

  if (!user) return null;

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto pb-24">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Alamat Saya</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="btn-primary text-sm"
        >
          + Tambah Alamat
        </button>
      </header>

      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      {!loading && items.length === 0 && !showForm && (
        <div className="card p-6 text-center">
          <p className="text-gray-600 mb-3">Belum ada alamat. Tambahin satu yuk.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">+ Tambah Alamat</button>
        </div>
      )}

      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium flex items-center gap-2">
                  {a.label}
                  {a.isDefault && (
                    <span className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded">Utama</span>
                  )}
                </p>
                <p className="text-sm text-gray-700">{a.recipientName} · {a.recipientPhone}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {a.fullAddress}, {a.subdistrict}, {a.district}, {a.city}, {a.province} {a.postalCode}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 text-sm">
              <button onClick={() => { setEditing(a); setShowForm(true); }} className="btn-outline">Ubah</button>
              <button onClick={() => handleDelete(a.id)} className="btn-outline text-red-600">Hapus</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <AddressForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={async () => { setShowForm(false); setEditing(null); await refresh(); }}
        />
      )}
    </div>
  );
}

function AddressForm({
  initial, onClose, onSaved,
}: {
  initial: Address | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { tokens } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<AddressInput>({
    resolver: zodResolver(addressInputSchema),
    defaultValues: initial ?? { isDefault: false },
  });

  async function onSubmit(data: AddressInput) {
    if (!tokens?.accessToken) return;
    setBusy(true);
    setError(null);
    try {
      if (initial) await updateAddress(tokens.accessToken, initial.id, data);
      else         await createAddress(tokens.accessToken, data);
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal simpan alamat');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg md:rounded-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <header className="px-4 py-3 border-b sticky top-0 bg-white flex items-center justify-between">
          <h2 className="font-semibold">{initial ? 'Ubah Alamat' : 'Tambah Alamat Baru'}</h2>
          <button onClick={onClose} aria-label="Tutup" className="text-gray-500 text-xl">✕</button>
        </header>
        <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 space-y-3" noValidate>
          <div>
            <label className="label">Label (mis. Rumah, Kantor)</label>
            <input className="input" {...register('label')} />
            {errors.label && <p className="text-sm text-red-600 mt-1">{errors.label.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nama Penerima</label>
              <input className="input" {...register('recipientName')} />
              {errors.recipientName && <p className="text-sm text-red-600 mt-1">{errors.recipientName.message}</p>}
            </div>
            <div>
              <label className="label">No HP Penerima</label>
              <input className="input" {...register('recipientPhone')} />
              {errors.recipientPhone && <p className="text-sm text-red-600 mt-1">{errors.recipientPhone.message}</p>}
            </div>
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
              <label className="label">Kota / Kabupaten</label>
              <input className="input" {...register('city')} />
              {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Kecamatan</label>
              <input className="input" {...register('district')} />
              {errors.district && <p className="text-sm text-red-600 mt-1">{errors.district.message}</p>}
            </div>
            <div>
              <label className="label">Kelurahan</label>
              <input className="input" {...register('subdistrict')} />
              {errors.subdistrict && <p className="text-sm text-red-600 mt-1">{errors.subdistrict.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Kode Pos</label>
            <input className="input" inputMode="numeric" maxLength={5} {...register('postalCode')} />
            {errors.postalCode && <p className="text-sm text-red-600 mt-1">{errors.postalCode.message}</p>}
          </div>
          <div>
            <label className="label">Alamat Lengkap (jalan, no rumah, patokan)</label>
            <textarea className="input min-h-[80px]" {...register('fullAddress')} />
            {errors.fullAddress && <p className="text-sm text-red-600 mt-1">{errors.fullAddress.message}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isDefault')} className="w-5 h-5" />
            Jadikan alamat utama
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Batal</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {busy ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
