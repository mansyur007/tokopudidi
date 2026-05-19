'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  productCreateSchema,
  type ProductCreateInput,
  formatRupiah,
} from '@tokopudidi/shared';
import { useAuthStore } from '@/store/auth';
import {
  createSellerProduct,
  updateSellerProduct,
  listCategoriesFlat,
  type CategoryFlat,
  type SellerProductDetail,
} from '@/lib/api/seller';
import { ApiClientError } from '@/lib/api/client';

interface Props {
  initial?: SellerProductDetail;
  productId?: string;
}

interface VariantState {
  id?: string;
  name: string;
  priceModifier: number;
  stock: number;
}

interface FormState {
  name: string;
  description: string;
  categoryId: string;
  price: number;
  stock: number;
  minOrderQty: number;
  weight: number;
  condition: 'NEW' | 'USED';
  isActive: boolean;
  imageUrls: string[];
  variants: VariantState[];
}

function initialFromProduct(p?: SellerProductDetail): FormState {
  return {
    name:        p?.name        ?? '',
    description: p?.description ?? '',
    categoryId:  p?.categoryId  ?? '',
    price:       p?.price       ?? 0,
    stock:       p?.stock       ?? 0,
    minOrderQty: p?.minOrderQty ?? 1,
    weight:      p?.weight      ?? 0,
    condition:   p?.condition   ?? 'NEW',
    isActive:    p?.isActive    ?? true,
    imageUrls:   p?.images.map((img) => img.url) ?? [],
    variants:    p?.variants.map((v) => ({ id: v.id, name: v.name, priceModifier: v.priceModifier, stock: v.stock })) ?? [],
  };
}

export function ProductForm({ initial, productId }: Props) {
  const router = useRouter();
  const { tokens } = useAuthStore();
  const [state, setState] = useState<FormState>(initialFromProduct(initial));
  const [categories, setCategories] = useState<CategoryFlat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listCategoriesFlat().then(setCategories).catch(() => undefined);
  }, []);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAddImage(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (state.imageUrls.length >= 5) {
        setError('Maksimal 5 foto produk');
        break;
      }
      if (file.size > 2 * 1024 * 1024) { setError('Ukuran maksimal 2MB per foto'); continue; }
      const url: string = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      setState((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, url] }));
    }
    e.target.value = '';
  }

  function removeImage(idx: number) {
    setState((prev) => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== idx) }));
  }

  function addVariant() {
    setState((prev) => ({ ...prev, variants: [...prev.variants, { name: '', priceModifier: 0, stock: 0 }] }));
  }
  function updateVariant(i: number, patch: Partial<VariantState>) {
    setState((prev) => ({
      ...prev,
      variants: prev.variants.map((v, idx) => idx === i ? { ...v, ...patch } : v),
    }));
  }
  function removeVariant(i: number) {
    setState((prev) => ({ ...prev, variants: prev.variants.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tokens?.accessToken) return;
    setError(null);

    const parsed = productCreateSchema.safeParse(state);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Ada field yang belum valid');
      return;
    }

    setBusy(true);
    try {
      if (productId) {
        await updateSellerProduct(tokens.accessToken, productId, parsed.data);
      } else {
        await createSellerProduct(tokens.accessToken, parsed.data as ProductCreateInput);
      }
      router.push('/seller/produk');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal simpan produk');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-4 max-w-3xl">
      {/* Foto */}
      <div>
        <label className="label">Foto Produk (1-5 foto, max 2MB)</label>
        <div className="flex gap-2 flex-wrap">
          {state.imageUrls.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded border overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                aria-label="Hapus foto"
                className="absolute top-0 right-0 bg-black/60 text-white text-xs w-5 h-5 leading-none"
              >✕</button>
            </div>
          ))}
          {state.imageUrls.length < 5 && (
            <label className="w-20 h-20 rounded border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer text-gray-500 text-sm">
              + Foto
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddImage} />
            </label>
          )}
        </div>
      </div>

      <div>
        <label className="label">Nama Produk</label>
        <input className="input" value={state.name} onChange={(e) => setField('name', e.target.value)} maxLength={120} required />
      </div>

      <div>
        <label className="label">Kategori</label>
        <select className="input" value={state.categoryId} onChange={(e) => setField('categoryId', e.target.value)} required>
          <option value="">Pilih kategori</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Harga (Rp)</label>
          <input
            type="number"
            className="input"
            value={state.price}
            min={100}
            onChange={(e) => setField('price', Number(e.target.value))}
            required
          />
          <p className="text-xs text-gray-500 mt-1">{formatRupiah(state.price)}</p>
        </div>
        <div>
          <label className="label">Stok</label>
          <input
            type="number"
            className="input"
            value={state.stock}
            min={0}
            onChange={(e) => setField('stock', Number(e.target.value))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Berat (gram)</label>
          <input
            type="number"
            className="input"
            value={state.weight}
            min={1}
            onChange={(e) => setField('weight', Number(e.target.value))}
            required
          />
        </div>
        <div>
          <label className="label">Min. Order</label>
          <input
            type="number"
            className="input"
            value={state.minOrderQty}
            min={1}
            onChange={(e) => setField('minOrderQty', Number(e.target.value))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Kondisi</label>
          <select className="input" value={state.condition} onChange={(e) => setField('condition', e.target.value as 'NEW' | 'USED')}>
            <option value="NEW">Baru</option>
            <option value="USED">Bekas</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={state.isActive ? '1' : '0'} onChange={(e) => setField('isActive', e.target.value === '1')}>
            <option value="1">Aktif (tampil di etalase)</option>
            <option value="0">Nonaktif (sembunyi)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Deskripsi</label>
        <textarea
          className="input min-h-[120px]"
          value={state.description}
          onChange={(e) => setField('description', e.target.value)}
          maxLength={5000}
          placeholder="Detail produk: bahan, ukuran, cara pakai, dll"
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Varian (opsional, 1 dimensi saja)</label>
          <button type="button" onClick={addVariant} className="btn-outline text-sm">+ Varian</button>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Contoh: warna (Merah, Biru), ukuran (S, M, L). Stok varian terpisah dari stok utama.
        </p>
        {state.variants.map((v, i) => (
          <div key={i} className="flex gap-2 mb-2 items-center">
            <input
              className="input flex-1 min-w-0"
              placeholder="Nama varian"
              value={v.name}
              onChange={(e) => updateVariant(i, { name: e.target.value })}
            />
            <input
              type="number"
              className="input w-28"
              placeholder="±harga"
              value={v.priceModifier}
              onChange={(e) => updateVariant(i, { priceModifier: Number(e.target.value) })}
            />
            <input
              type="number"
              className="input w-20"
              placeholder="Stok"
              value={v.stock}
              min={0}
              onChange={(e) => updateVariant(i, { stock: Number(e.target.value) })}
            />
            <button type="button" onClick={() => removeVariant(i)} className="text-red-600 px-2" aria-label="Hapus varian">✕</button>
          </div>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}

      <div className="flex gap-2 sticky bottom-0 bg-white pt-3 border-t">
        <Link href="/seller/produk" className="btn-outline flex-1 text-center">Batal</Link>
        <button type="submit" disabled={busy} className="btn-primary flex-1">
          {busy ? 'Menyimpan...' : (productId ? 'Simpan Perubahan' : 'Tambah Produk')}
        </button>
      </div>
    </form>
  );
}
