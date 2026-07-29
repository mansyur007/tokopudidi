// Bentuk respons variant multi-axis (M11-A8).
//
// Prisma mengembalikan tautan nilai sebagai baris join bersarang. FE cuma butuh
// daftar nilai yang sudah urut sesuai option, jadi diratakan di sini — satu
// tempat, dipakai endpoint publik maupun seller.

interface VariantValueRow {
  optionValue: {
    id: string;
    value: string;
    option: { order: number };
  };
}

interface VariantRow {
  values?: VariantValueRow[];
  [k: string]: unknown;
}

/**
 * Ratakan `variant.values` jadi dua array sejajar urutan option:
 * `optionValues` (label, mis. ["Merah","M"]) dan `optionValueIds`.
 *
 * Variant lama yang belum di-backfill tidak punya tautan sama sekali —
 * `optionValues` jadi array kosong dan FE jatuh ke mode 1 sumbu memakai `name`.
 */
export function flattenVariant<T extends VariantRow>(v: T) {
  const sorted = [...(v.values ?? [])].sort(
    (a, b) => a.optionValue.option.order - b.optionValue.option.order,
  );
  const { values, ...rest } = v;
  return {
    ...rest,
    optionValues: sorted.map((x) => x.optionValue.value),
    optionValueIds: sorted.map((x) => x.optionValue.id),
  };
}

/** Terapkan `flattenVariant` ke seluruh variant sebuah produk. */
export function withVariantValues<T extends { variants?: VariantRow[] }>(product: T) {
  if (!product?.variants) return product;
  return { ...product, variants: product.variants.map(flattenVariant) };
}
