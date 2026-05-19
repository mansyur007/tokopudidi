import Link from 'next/link';
import { ProductForm } from '@/components/seller/ProductForm';

export default function NewProductPage() {
  return (
    <div className="px-4 md:px-6 py-4 max-w-3xl">
      <Link href="/seller/produk" className="text-sm text-primary">← Kembali</Link>
      <h1 className="text-xl font-semibold mt-1 mb-3">Tambah Produk</h1>
      <ProductForm />
    </div>
  );
}
