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
import { VariantMatrixEditor, type OptionState, type ComboState } from './VariantMatrixEditor';

interface Props {
  initial?: SellerProductDetail;
  productId?: string;
}

// Varian multi-axis (M11-A8) — bentuk state mengikuti VariantMatrixEditor.

interface FormState {
  name: string;
  description: string;
  categoryId: string;
  price: number;
  stock: number;
  minOrderQty: number;
  weight: number;
  condition: 'NEW' | 'USED';
  codAvailable: boolean;
  freeShippingEligible: boolean;
  isActive: boolean;
  imageUrls: string[];
  options: OptionState[];
  combos: ComboState[];
  // Diskon periodik (M9-B3) — tanggal dalam format input datetime-local.
  saleEnabled: boolean;
  salePrice: number;
  saleStartAt: string;
  saleEndAt: string;
}

// ISO → format input datetime-local ("YYYY-MM-DDTHH:mm", waktu lokal).
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    codAvailable:         p?.codAvailable         ?? true,
    freeShippingEligible: p?.freeShippingEligible ?? false,
    isActive:    p?.isActive    ?? true,
    imageUrls:   p?.images.map((img) => img.url) ?? [],
    options:     p?.options?.map((o) => ({ name: o.name, values: o.values.map((v) => v.value) })) ?? [],
    // Varian lama yang belum di-backfill tidak punya optionValues — pakai
    // `name` sebagai nilai tunggal supaya tetap bisa diedit tanpa kehilangan data.
    combos:      p?.variants.map((v) => ({
      values: v.optionValues?.length ? v.optionValues : [v.name],
      priceModifier: v.priceModifier,
      stock: v.stock,
    })) ?? [],
    saleEnabled: p?.salePrice != null,
    salePrice:   p?.salePrice   ?? 0,
    saleStartAt: toLocalInput(p?.saleStartAt),
    saleEndAt:   toLocalInput(p?.saleEndAt),
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


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tokens?.accessToken) return;
    setError(null);

    const { saleEnabled, salePrice, saleStartAt, saleEndAt, options, combos, ...base } = state;
    // Buang opsi setengah jadi (nama/nilai kosong) supaya tidak ditolak zod
    // hanya karena baris yang belum diisi seller.
    const opsiValid = options.filter((o) => o.name.trim() && o.values.length > 0);
    const candidate = {
      ...base,
      options: opsiValid.length ? opsiValid : undefined,
      variants: opsiValid.length
        ? combos.filter((c) => c.values.length === opsiValid.length)
        : undefined,
      salePrice: saleEnabled ? salePrice : null,
      saleStartAt: saleEnabled && saleStartAt ? new Date(saleStartAt).toISOString() : null,
      saleEndAt: saleEnabled && saleEndAt ? new Date(saleEndAt).toISOString() : null,
    };
    const parsed = productCreateSchema.safeParse(candidate);
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

      {/* Diskon Periodik (M9-B3) */}
      <div className="border rounded-lg p-3 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={state.saleEnabled}
            onChange={(e) => setField('saleEnabled', e.target.checked)}
          />
          <span className="font-medium text-sm">🏷️ Diskon Periodik</span>
          <span className="text-xs text-gray-500">— harga coret + badge persen selama periode</span>
        </label>
        {state.saleEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Harga Diskon (Rp)</label>
              <input
                type="number"
                className="input"
                value={state.salePrice}
                min={100}
                max={Math.max(100, state.price - 1)}
                onChange={(e) => setField('salePrice', Number(e.target.value))}
              />
              {state.salePrice > 0 && state.price > 0 && state.salePrice < state.price && (
                <p className="text-xs text-red-600 mt-1">
                  -{Math.round(((state.price - state.salePrice) / state.price) * 100)}% dari {formatRupiah(state.price)}
                </p>
              )}
            </div>
            <div>
              <label className="label">Mulai</label>
              <input
                type="datetime-local"
                className="input"
                value={state.saleStartAt}
                onChange={(e) => setField('saleStartAt', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Berakhir</label>
              <input
                type="datetime-local"
                className="input"
                value={state.saleEndAt}
                onChange={(e) => setField('saleEndAt', e.target.value)}
              />
            </div>
          </div>
        )}
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

      {/* Opsi pengiriman (M10-A10) — jadi filter di pencarian & berlaku saat checkout. */}
      <div className="card p-3 space-y-2 bg-gray-50">
        <p className="text-sm font-medium">🚚 Opsi Pengiriman</p>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={state.codAvailable}
            onChange={(e) => setField('codAvailable', e.target.checked)}
          />
          <span>
            Bisa COD
            <span className="block text-xs text-gray-500">
              Kalau dimatikan, produk ini tidak bisa di-checkout dengan bayar di tempat.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={state.freeShippingEligible}
            onChange={(e) => setField('freeShippingEligible', e.target.checked)}
          />
          <span>
            Bebas ongkir
            <span className="block text-xs text-gray-500">
              Ongkir ditanggung toko. Gratis berlaku kalau seluruh isi pesanan dari toko ini bebas ongkir.
            </span>
          </span>
        </label>
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

      <VariantMatrixEditor
        options={state.options}
        combos={state.combos}
        onChange={({ options, combos }) => setState((prev) => ({ ...prev, options, combos }))}
      />

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
