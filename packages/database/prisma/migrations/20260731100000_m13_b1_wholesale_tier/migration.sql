-- M13-B1: harga grosir bertingkat (tiered pricing).
-- Aditif murni — satu tabel baru, tidak menyentuh tabel existing.

CREATE TABLE "ProductWholesaleTier" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "ProductWholesaleTier_pkey" PRIMARY KEY ("id")
);

-- Dua tier dengan ambang sama pada satu produk membuat harganya ambigu.
-- Index ini sekaligus melayani pengurutan tier per produk, jadi tidak ada
-- index tambahan untuk "productId" saja.
CREATE UNIQUE INDEX "ProductWholesaleTier_productId_minQty_key" ON "ProductWholesaleTier"("productId", "minQty");

-- Produk dihapus -> tier ikut bersih; tidak ada harga yatim yang bisa terpakai.
ALTER TABLE "ProductWholesaleTier" ADD CONSTRAINT "ProductWholesaleTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
