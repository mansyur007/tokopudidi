// Helper kombinasi variant multi-axis (M11-A8).
//
// Dipakai bersama API (validasi + matching saat simpan) dan FE (matrix editor,
// pemilihan chip di BuyBox) supaya aturannya cuma hidup di satu tempat.

export const MAX_VARIANT_OPTIONS = 3;
export const MAX_VARIANT_COMBINATIONS = 50;

/** Pemisah label gabungan, mis. "Merah / M". */
export const VARIANT_LABEL_SEP = ' / ';

export interface OptionInput {
  name: string;
  values: string[];
}

/**
 * Kunci kombinasi yang stabil terhadap urutan penulisan.
 *
 * Dipakai untuk mencocokkan variant lama dengan payload baru saat edit. Nilai
 * di-encode supaya nilai yang mengandung pemisah tidak bisa memalsukan
 * kombinasi lain ("a|b" vs ["a","b"]).
 */
export function comboKey(values: string[]): string {
  return values.map((v) => encodeURIComponent(v.trim())).join('|');
}

/** Label yang dilihat manusia, mis. ["Merah","M"] → "Merah / M". */
export function comboLabel(values: string[]): string {
  return values.map((v) => v.trim()).join(VARIANT_LABEL_SEP);
}

/**
 * Semua kombinasi kartesius dari nilai tiap option, urutan option dipertahankan.
 * `[]` kalau tidak ada option, atau ada option tanpa nilai (kartesius dengan
 * himpunan kosong memang kosong).
 */
export function cartesian(options: OptionInput[]): string[][] {
  if (options.length === 0) return [];
  if (options.some((o) => o.values.length === 0)) return [];

  let acc: string[][] = [[]];
  for (const opt of options) {
    const next: string[][] = [];
    for (const combo of acc) {
      for (const value of opt.values) next.push([...combo, value]);
    }
    acc = next;
  }
  return acc;
}

/** Jumlah kombinasi tanpa membangun array-nya — untuk cek batas lebih dulu. */
export function countCombinations(options: OptionInput[]): number {
  if (options.length === 0) return 0;
  return options.reduce((n, o) => n * o.values.length, 1);
}

export interface VariantLike {
  /** Nilai per option, sejajar urutan `options`. */
  values: string[];
  stock: number;
  isActive?: boolean;
}

/**
 * Nilai-nilai pada `optionIndex` yang masih bisa dipilih, mengingat pilihan
 * yang sudah dibuat di option lain.
 *
 * Aturannya: sebuah nilai tersedia kalau ada **minimal satu** kombinasi aktif
 * dan berstok yang memuat nilai itu sekaligus cocok dengan semua pilihan lain
 * yang sudah ditetapkan. Pilihan pada option yang sedang dihitung sengaja
 * diabaikan — kalau tidak, tiap nilai hanya akan "tersedia" untuk dirinya
 * sendiri dan chip lain terkunci selamanya.
 */
export function availableValues(
  optionIndex: number,
  options: OptionInput[],
  variants: VariantLike[],
  selected: (string | undefined)[],
): Set<string> {
  const out = new Set<string>();
  for (const v of variants) {
    if (v.isActive === false || v.stock <= 0) continue;
    const cocok = selected.every(
      (sel, i) => i === optionIndex || sel === undefined || v.values[i] === sel,
    );
    if (cocok && v.values[optionIndex] !== undefined) out.add(v.values[optionIndex]);
  }
  return out;
}

/** Variant yang persis cocok dengan pilihan lengkap; `null` kalau belum lengkap. */
export function findVariant<T extends VariantLike>(
  variants: T[],
  selected: (string | undefined)[],
  optionCount: number,
): T | null {
  if (selected.length !== optionCount || selected.some((s) => s === undefined)) return null;
  const key = comboKey(selected as string[]);
  return variants.find((v) => comboKey(v.values) === key) ?? null;
}
