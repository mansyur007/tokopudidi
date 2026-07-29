// Penyimpanan variant multi-axis (M11-A8).
//
// Dipakai create & update produk. Dipisah dari route karena aturannya halus:
// kombinasi yang hilang dari payload TIDAK boleh dihapus.
import { Prisma } from '@tokopudidi/database';
import { comboKey, comboLabel } from '@tokopudidi/shared';

export interface OptionPayload {
  name: string;
  values: string[];
}

export interface VariantPayload {
  values: string[];
  priceModifier?: number;
  stock: number;
  imageUrl?: string | null;
  isActive?: boolean;
}

/**
 * Tulis ulang option/value produk dan sinkronkan kombinasinya.
 *
 * Dijalankan di dalam transaksi milik pemanggil.
 *
 * Kenapa kombinasi lama dinonaktifkan, bukan dihapus: `ProductVariant.id`
 * dipegang `CartItem.variantId` (FK `ON DELETE SET NULL` — menghapusnya membuat
 * item keranjang orang lain diam-diam berubah jadi "tanpa varian") dan
 * `OrderItem.variantId` (kolom polos tanpa FK — jadi riwayat pesanan akan
 * menunjuk baris yang sudah lenyap). Menonaktifkan menjaga keduanya tetap
 * konsisten; varian nonaktif memang sudah disaring dari tampilan pembeli.
 */
export async function writeProductVariants(
  tx: Prisma.TransactionClient,
  productId: string,
  options: OptionPayload[],
  variants: VariantPayload[],
): Promise<void> {
  // Tanpa opsi, produk dianggap tidak punya varian sama sekali.
  if (options.length === 0 || variants.length === 0) {
    await tx.productOption.deleteMany({ where: { productId } });
    await tx.productVariant.updateMany({ where: { productId }, data: { isActive: false } });
    return;
  }

  // Baca kombinasi lama SEBELUM option dihapus, supaya pencocokan memakai
  // tautan nilai yang sebenarnya. Mengurai `name` tidak bisa diandalkan: nilai
  // yang mengandung " / " akan terpecah jadi kombinasi yang salah.
  const existingRows = await tx.productVariant.findMany({
    where: { productId },
    select: {
      id: true,
      name: true,
      values: {
        select: {
          optionValue: {
            select: { value: true, order: true, option: { select: { order: true } } },
          },
        },
      },
    },
  });

  const byKey = new Map<string, string>();
  for (const v of existingRows) {
    const values = v.values.length
      // Urutkan sesuai urutan option supaya kuncinya sejajar dengan payload.
      ? [...v.values]
          .sort((a, b) => a.optionValue.option.order - b.optionValue.option.order)
          .map((x) => x.optionValue.value)
      // Variant lama yang belum di-backfill: tidak punya tautan nilai sama
      // sekali, jadi `name` adalah satu-satunya petunjuk (1 sumbu).
      : [v.name];
    byKey.set(comboKey(values), v.id);
  }

  // Option/value ditulis ulang dari nol: keduanya tidak direferensikan tabel
  // transaksional mana pun, jadi aman dihapus (cascade ikut membersihkan
  // ProductVariantValue).
  await tx.productOption.deleteMany({ where: { productId } });

  const valueId = new Map<string, string>(); // "optionIdx|value" -> optionValueId
  for (const [oi, opt] of options.entries()) {
    const option = await tx.productOption.create({
      data: { productId, name: opt.name.trim(), order: oi },
    });
    for (const [vi, raw] of opt.values.entries()) {
      const value = raw.trim();
      const row = await tx.productOptionValue.create({
        data: { optionId: option.id, value, order: vi },
      });
      valueId.set(`${oi}|${value}`, row.id);
    }
  }

  const keptIds: string[] = [];

  for (const v of variants) {
    const values = v.values.map((x) => x.trim());
    const key = comboKey(values);
    const label = comboLabel(values);
    const data = {
      name: label,
      priceModifier: v.priceModifier ?? 0,
      stock: v.stock,
      imageUrl: v.imageUrl ?? null,
      isActive: v.isActive ?? true,
    };

    const existingId = byKey.get(key);
    let variantId: string;
    if (existingId) {
      // Update di tempat — id dipertahankan supaya keranjang & riwayat pesanan
      // yang menunjuk kombinasi ini tetap sah.
      await tx.productVariant.update({ where: { id: existingId }, data });
      variantId = existingId;
    } else {
      const created = await tx.productVariant.create({ data: { productId, ...data } });
      variantId = created.id;
    }
    keptIds.push(variantId);

    await tx.productVariantValue.createMany({
      data: values
        .map((value, oi) => valueId.get(`${oi}|${value}`))
        .filter((id): id is string => Boolean(id))
        .map((optionValueId) => ({ variantId, optionValueId })),
      skipDuplicates: true,
    });
  }

  // Kombinasi yang tidak lagi ditawarkan: nonaktifkan, jangan hapus.
  await tx.productVariant.updateMany({
    where: { productId, id: { notIn: keptIds } },
    data: { isActive: false },
  });
}
