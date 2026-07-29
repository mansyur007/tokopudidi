// Urutan etalase (M11-B1). Dipisah dari route supaya bisa diuji tanpa DB.

export interface OrderableShowcase {
  id: string;
  order: number;
}

/**
 * Tukar posisi satu etalase dengan tetangganya, lalu tulis ulang seluruh urutan
 * jadi 0..n-1.
 *
 * Normalisasi itu sengaja: kolom `order` di DB bisa kembar atau bolong (etalase
 * dihapus di tengah, atau dua baris dibuat bersamaan), dan swap yang hanya
 * menukar dua nilai `order` akan diam-diam gagal kalau nilainya kebetulan sama.
 * Menulis ulang berdasarkan posisi array membuat hasilnya selalu deterministik.
 *
 * `items` harus sudah terurut sesuai tampilan (order asc, createdAt asc).
 * Mengembalikan `null` kalau tidak ada yang perlu diubah — id tidak ada, atau
 * sudah berada di ujung.
 */
export function swapAndNormalize(
  items: OrderableShowcase[],
  id: string,
  direction: 'up' | 'down',
): { id: string; order: number }[] | null {
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) return null;

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= items.length) return null;

  const reordered = [...items];
  [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

  return reordered.map((it, i) => ({ id: it.id, order: i }));
}
