'use client';

// M14-A2 — satu-satunya tempat user mengisi/menghapus email akunnya.
//
// Tanpa komponen ini seluruh email transaksional tidak punya tujuan kirim:
// register lama tidak pernah menanyakan email, dan tidak ada halaman profil
// yang bisa mengisinya. Sengaja ditaruh di kartu paling atas /akun, bukan
// disembunyikan di submenu — alamat yang tidak pernah diisi sama saja dengan
// fitur yang tidak pernah jalan.

import { useState } from 'react';
import { apiUpdateProfile } from '@/lib/api/auth';
import { ApiClientError } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';

export default function ProfileEmail() {
  const { user, tokens, setAuth } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user || !tokens) return null;

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!tokens) return;
    setError(null);
    setSaving(true);
    try {
      const updated = await apiUpdateProfile(tokens.accessToken, { email: value.trim() });
      setAuth(updated, tokens);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal menyimpan. Coba lagi ya?');
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="card px-4 py-3 mb-4 flex items-center gap-3">
        <span aria-hidden className="text-xl">✉️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            Email {saved && <span className="text-green-700 font-normal">· tersimpan</span>}
          </p>
          <p className="text-sm text-gray-500 truncate" data-testid="profil-email">
            {user.email || 'Belum diisi — invoice & status pesanan tidak dikirim'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(true); setSaved(false); setValue(user.email ?? ''); }}
          className="text-sm text-primary font-medium hover:underline shrink-0"
        >
          {user.email ? 'Ubah' : 'Isi'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={simpan} className="card px-4 py-3 mb-4" noValidate>
      <label htmlFor="profil-email-input" className="label">Email</label>
      <input
        id="profil-email-input"
        type="email"
        autoComplete="email"
        placeholder="budi@email.com"
        className="input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <p className="text-xs text-gray-500 mt-1">
        Kosongkan untuk berhenti menerima email dari Tokopudidi.
      </p>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setError(null); }}
          className="px-4 py-2 text-sm text-gray-600 hover:underline"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
