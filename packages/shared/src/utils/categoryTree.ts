// M9-C1 — perluasan kategori ke seluruh turunannya.
//
// Kategori berbentuk pohon (`Category.parentId`), dan produk hidup di
// **daun**-nya. Voucher yang di-scope ke kategori induk tapi hanya
// dicocokkan persis dengan `product.categoryId` karena itu praktis tidak
// pernah kena apa pun: "Voucher Elektronik" tidak berlaku untuk produk di
// "Elektronik › Handphone", yang justru satu-satunya tempat produknya ada.
//
// Fungsi di sini **murni** supaya bisa diuji tanpa DB — termasuk kasus yang
// paling sulit dipancing lewat data sungguhan: pohon yang punya siklus.

export interface CategoryNode {
  id: string;
  parentId: string | null;
}

/**
 * Kumpulan id kategori `rootId` beserta seluruh turunannya.
 *
 * Tahan terhadap **siklus**: data lama bisa saja punya A→B→A (tidak ada
 * constraint yang mencegahnya di sisi database), dan penelusuran naif akan
 * berputar sampai kehabisan memori. Node yang sudah dikunjungi tidak
 * dikunjungi ulang, jadi siklus berhenti dengan sendirinya.
 *
 * `rootId` yang tidak ada di daftar tetap dikembalikan sebagai dirinya
 * sendiri — voucher menunjuk kategori yang sudah dihapus tidak boleh
 * tiba-tiba berlaku untuk SEMUA produk.
 */
export function expandCategoryTree(rootId: string, semua: CategoryNode[]): Set<string> {
  const anak = new Map<string, string[]>();
  for (const c of semua) {
    if (!c.parentId) continue;
    const daftar = anak.get(c.parentId);
    if (daftar) daftar.push(c.id);
    else anak.set(c.parentId, [c.id]);
  }

  const hasil = new Set<string>([rootId]);
  const antre = [rootId];
  while (antre.length) {
    const kini = antre.pop()!;
    for (const c of anak.get(kini) ?? []) {
      if (hasil.has(c)) continue; // penjaga siklus
      hasil.add(c);
      antre.push(c);
    }
  }
  return hasil;
}

/**
 * Jumlahkan subtotal item yang kategorinya masuk `scope`.
 *
 * Dipisah dari query supaya aturan "apa yang jadi dasar diskon" bisa diuji
 * sebagai aritmetika, bukan lewat checkout utuh.
 */
export function subtotalDalamKategori(
  items: Array<{ categoryId: string; subtotal: number }>,
  scope: Set<string>,
): number {
  return items.reduce((acc, it) => (scope.has(it.categoryId) ? acc + it.subtotal : acc), 0);
}
