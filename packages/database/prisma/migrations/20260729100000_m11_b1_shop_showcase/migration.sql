-- M11-B1: etalase / showcase toko.
-- Aditif murni — dua tabel baru, tidak menyentuh tabel existing.

CREATE TABLE "ShopShowcase" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopShowcase_pkey" PRIMARY KEY ("id")
);

-- Satu produk boleh ada di banyak etalase; PK gabungan mencegah duplikat dalam
-- etalase yang sama.
CREATE TABLE "ShopShowcaseProduct" (
    "showcaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShopShowcaseProduct_pkey" PRIMARY KEY ("showcaseId","productId")
);

CREATE INDEX "ShopShowcase_shopId_order_idx" ON "ShopShowcase"("shopId", "order");

-- Slug stabil per toko — dipakai URL /toko/[slug]/etalase/[showcaseSlug].
CREATE UNIQUE INDEX "ShopShowcase_shopId_slug_key" ON "ShopShowcase"("shopId", "slug");

CREATE INDEX "ShopShowcaseProduct_showcaseId_order_idx" ON "ShopShowcaseProduct"("showcaseId", "order");

CREATE INDEX "ShopShowcaseProduct_productId_idx" ON "ShopShowcaseProduct"("productId");

ALTER TABLE "ShopShowcase" ADD CONSTRAINT "ShopShowcase_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cascade dua arah: hapus etalase atau hapus produk sama-sama membersihkan baris join.
ALTER TABLE "ShopShowcaseProduct" ADD CONSTRAINT "ShopShowcaseProduct_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "ShopShowcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShopShowcaseProduct" ADD CONSTRAINT "ShopShowcaseProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
