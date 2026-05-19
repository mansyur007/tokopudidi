'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { getSellerProduct, type SellerProductDetail } from '@/lib/api/seller';
import { ProductForm } from '@/components/seller/ProductForm';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { tokens } = useAuthStore();
  const [product, setProduct] = useState<SellerProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokens?.accessToken) return;
    getSellerProduct(tokens.accessToken, id)
      .then(setProduct)
      .catch((err) => setError(err.message ?? 'Gagal memuat produk'))
      .finally(() => setLoading(false));
  }, [tokens?.accessToken, id]);

  return (
    <div className="px-4 md:px-6 py-4 max-w-3xl">
      <Link href="/seller/produk" className="text-sm text-primary">← Kembali</Link>
      <h1 className="text-xl font-semibold mt-1 mb-3">Edit Produk</h1>
      {loading && <p className="text-sm text-gray-500">Memuat...</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {product && <ProductForm initial={product} productId={product.id} />}
    </div>
  );
}
