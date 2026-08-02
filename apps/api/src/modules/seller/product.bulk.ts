import type { BulkProductItemInput } from '@tokopudidi/shared';

// Bulk edit stok & harga (M14-B2) — pemeriksaan yang tidak bisa dilakukan zod.
//
// Zod hanya melihat payload. Yang menentukan boleh-tidaknya sebuah harga baru
// justru data yang TIDAK ikut dikirim: diskon periodik (M9-B3) dan harga grosir
// (M13-B1) yang sudah tersimpan di produk itu. Turunkan harga normal lewat bulk
// edit tanpa pemeriksaan ini, dan diskon/tier lama diam-diam jadi lebih mahal
// daripada harga biasa — jalur satuan (`PATCH /seller/products/:id`) sudah
// menolaknya sejak M9-B3 & M13-B1, jadi tanpa pemeriksaan yang sama di sini
// bulk edit cuma jadi pintu belakang untuk menembus aturan itu.

export interface BulkTargetProduct {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  wholesaleTiers: { minQty: number; price: number }[];
}

export interface BulkConflict {
  id: string;
  name: string;
  reason: string;
}

/**
 * Baris yang harga barunya bertabrakan dengan diskon / harga grosir existing.
 *
 * Hanya baris yang benar-benar **mengubah harga** yang diperiksa. Baris yang
 * cuma menyentuh stok atau status aktif sengaja dilewati: kalau produk itu
 * sudah telanjur punya data harga yang tidak konsisten dari sebelumnya,
 * memblokir penyesuaian stoknya tidak memperbaiki apa pun — hanya membuat
 * seller tidak bisa mengurus stok sampai ia menyadari masalah yang tidak ada
 * kaitannya dengan yang sedang ia kerjakan.
 */
export function findBulkPriceConflicts(
  items: BulkProductItemInput[],
  existing: BulkTargetProduct[],
): BulkConflict[] {
  const byId = new Map(existing.map((p) => [p.id, p]));
  const conflicts: BulkConflict[] = [];

  for (const item of items) {
    if (item.price === undefined) continue;
    const product = byId.get(item.id);
    if (!product) continue; // kepemilikan sudah ditolak lebih dulu di route

    const nextPrice = item.price;

    if (product.salePrice != null && product.salePrice >= nextPrice) {
      conflicts.push({
        id: product.id,
        name: product.name,
        reason: `Harga baru harus di atas harga diskon yang sedang berjalan (Rp ${product.salePrice.toLocaleString('id-ID')})`,
      });
      continue; // satu alasan per baris sudah cukup untuk ditindaklanjuti
    }

    // Tier termahal yang menabrak — bukan tier pertama yang ditemukan, supaya
    // angka yang disebut ke seller adalah batas yang sebenarnya harus dilewati.
    const tertinggi = product.wholesaleTiers.reduce<number | null>(
      (max, t) => (t.price >= nextPrice && (max === null || t.price > max) ? t.price : max),
      null,
    );
    if (tertinggi !== null) {
      conflicts.push({
        id: product.id,
        name: product.name,
        reason: `Harga baru harus di atas harga grosir tertinggi (Rp ${tertinggi.toLocaleString('id-ID')})`,
      });
    }
  }

  return conflicts;
}

/** Field yang benar-benar ditulis untuk satu baris — `undefined` tidak ikut. */
export function toBulkUpdateData(item: BulkProductItemInput): {
  price?: number;
  stock?: number;
  isActive?: boolean;
} {
  return {
    ...(item.price !== undefined && { price: item.price }),
    ...(item.stock !== undefined && { stock: item.stock }),
    ...(item.isActive !== undefined && { isActive: item.isActive }),
  };
}
