#!/usr/bin/env node
// M11-A8 tahap 2 — backfill lapisan option/value untuk variant lama.
//
// Variant sebelum M11-A8 hanya punya satu sumbu bebas (`ProductVariant.name`,
// mis. "Merah", "XL"). Script ini membuatkan satu ProductOption bernama
// "Varian" per produk, satu ProductOptionValue per nama variant, lalu
// menautkannya lewat ProductVariantValue.
//
// IDEMPOTEN: produk yang sudah punya option dilewati, jadi aman dijalankan
// berkali-kali dan aman diulang kalau terputus di tengah.
//
// Pakai:
//   node --env-file=.env scripts/backfill-variant-options.mjs [--dry-run]
//
// Butuh Node 20.6+ (untuk --env-file). Tanpa --env-file, pastikan DATABASE_URL
// sudah ada di environment.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const OPTION_NAME = 'Varian';

async function main() {
  if (DRY_RUN) console.log('— DRY RUN: tidak ada yang ditulis —\n');

  const products = await prisma.product.findMany({
    where: {
      // Hanya produk yang punya variant tapi belum punya option.
      variants: { some: {} },
      options: { none: {} },
    },
    select: {
      id: true,
      name: true,
      variants: { select: { id: true, name: true }, orderBy: { id: 'asc' } },
    },
  });

  if (products.length === 0) {
    console.log('Tidak ada produk yang perlu di-backfill. Selesai.');
    return;
  }

  console.log(`${products.length} produk akan di-backfill.\n`);

  let okCount = 0;
  let skipCount = 0;
  const warnings = [];

  for (const p of products) {
    // Nama variant kosong tidak bisa jadi nilai opsi yang berarti.
    const named = p.variants.filter((v) => v.name && v.name.trim().length > 0);
    if (named.length === 0) {
      warnings.push(`SKIP  ${p.name} — semua variant tanpa nama`);
      skipCount++;
      continue;
    }
    if (named.length < p.variants.length) {
      warnings.push(`WARN  ${p.name} — ${p.variants.length - named.length} variant tanpa nama, dilewati`);
    }

    // Beberapa variant bisa punya nama sama (data lama tidak menjamin unik).
    // Nilai opsi di-dedupe; variant yang bernama sama menunjuk nilai yang sama.
    const uniqueValues = [...new Set(named.map((v) => v.name.trim()))];
    if (uniqueValues.length < named.length) {
      warnings.push(
        `WARN  ${p.name} — ada nama variant kembar, ${named.length} variant memakai ${uniqueValues.length} nilai`,
      );
    }

    if (DRY_RUN) {
      console.log(`[dry] ${p.name}: opsi "${OPTION_NAME}" = [${uniqueValues.join(', ')}]`);
      okCount++;
      continue;
    }

    // Satu transaksi per produk: kalau gagal di tengah, produk itu tetap tanpa
    // option sama sekali sehingga run berikutnya mengulanginya dari bersih.
    await prisma.$transaction(async (tx) => {
      const option = await tx.productOption.create({
        data: { productId: p.id, name: OPTION_NAME, order: 0 },
      });

      const valueByName = new Map();
      for (const [i, value] of uniqueValues.entries()) {
        const row = await tx.productOptionValue.create({
          data: { optionId: option.id, value, order: i },
        });
        valueByName.set(value, row.id);
      }

      await tx.productVariantValue.createMany({
        data: named.map((v) => ({
          variantId: v.id,
          optionValueId: valueByName.get(v.name.trim()),
        })),
        skipDuplicates: true,
      });
    });

    okCount++;
    console.log(`OK    ${p.name} — ${uniqueValues.length} nilai`);
  }

  if (warnings.length) {
    console.log('\nCatatan:');
    for (const w of warnings) console.log('  ' + w);
  }
  console.log(`\nSelesai: ${okCount} produk di-backfill, ${skipCount} dilewati.`);
}

main()
  .catch((err) => {
    console.error('Backfill gagal:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
