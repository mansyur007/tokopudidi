-- M11-A8 tahap 1: lapisan option/value untuk variant multi-axis.
--
-- Aditif murni. `ProductVariant` (termasuk kolom `name`) sengaja TIDAK diubah:
-- id-nya dipegang CartItem lewat FK dan OrderItem lewat kolom polos, dan
-- `name` masih dibaca snapshot OrderItem.variantName. Drop `name` adalah
-- tahap 4 — migration terpisah, setelah backfill diverifikasi di produksi.

-- Gambar khusus per kombinasi (mis. foto warna merah). Null = pakai galeri produk.
ALTER TABLE "ProductVariant" ADD COLUMN "imageUrl" TEXT;

CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductOptionValue" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductVariantValue" (
    "variantId" TEXT NOT NULL,
    "optionValueId" TEXT NOT NULL,

    CONSTRAINT "ProductVariantValue_pkey" PRIMARY KEY ("variantId","optionValueId")
);

CREATE INDEX "ProductOption_productId_order_idx" ON "ProductOption"("productId", "order");

CREATE UNIQUE INDEX "ProductOption_productId_name_key" ON "ProductOption"("productId", "name");

CREATE INDEX "ProductOptionValue_optionId_order_idx" ON "ProductOptionValue"("optionId", "order");

CREATE UNIQUE INDEX "ProductOptionValue_optionId_value_key" ON "ProductOptionValue"("optionId", "value");

CREATE INDEX "ProductVariantValue_optionValueId_idx" ON "ProductVariantValue"("optionValueId");

ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariantValue" ADD CONSTRAINT "ProductVariantValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariantValue" ADD CONSTRAINT "ProductVariantValue_optionValueId_fkey" FOREIGN KEY ("optionValueId") REFERENCES "ProductOptionValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
