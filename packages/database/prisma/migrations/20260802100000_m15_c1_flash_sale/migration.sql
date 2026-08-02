-- M15-C1: flash sale terjadwal (dikurasi admin, ber-kuota).
-- Aditif murni: dua tabel baru + satu kolom nullable di OrderItem. Tidak ada
-- kolom/baris existing yang diubah artinya, jadi tidak butuh skrip rollback
-- data (turunkan dengan DROP kalau perlu).

CREATE TABLE "FlashSale" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSale_pkey" PRIMARY KEY ("id")
);

-- Satu-satunya query panas di sisi pembeli: "event mana yang berjalan sekarang".
CREATE INDEX "FlashSale_isActive_startAt_endAt_idx" ON "FlashSale"("isActive", "startAt", "endAt");

CREATE TABLE "FlashSaleItem" (
    "id" TEXT NOT NULL,
    "flashSaleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    -- Harga satuan selama event; divalidasi < Product.price saat disimpan.
    "salePrice" INTEGER NOT NULL,
    "quota" INTEGER NOT NULL,
    -- Dinaikkan atomik dalam transaksi checkout, diturunkan lagi lewat
    -- restoreStock saat pesanannya batal/kedaluwarsa/direfund.
    "soldCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FlashSaleItem_pkey" PRIMARY KEY ("id")
);

-- Satu produk cukup sekali per event: dua baris membuat harga & kuotanya ambigu.
CREATE UNIQUE INDEX "FlashSaleItem_flashSaleId_productId_key" ON "FlashSaleItem"("flashSaleId", "productId");
-- Untuk resolusi harga saat checkout & pemeriksaan tumpang tindih antar event.
CREATE INDEX "FlashSaleItem_productId_idx" ON "FlashSaleItem"("productId");

ALTER TABLE "FlashSaleItem" ADD CONSTRAINT "FlashSaleItem_flashSaleId_fkey" FOREIGN KEY ("flashSaleId") REFERENCES "FlashSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlashSaleItem" ADD CONSTRAINT "FlashSaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Snapshot slot flash yang dipakai sebuah baris pesanan. NULL = baris ini tidak
-- memakai harga flash.
ALTER TABLE "OrderItem" ADD COLUMN "flashSaleItemId" TEXT;

CREATE INDEX "OrderItem_flashSaleItemId_idx" ON "OrderItem"("flashSaleItemId");

-- SET NULL, bukan CASCADE: menghapus sebuah slot flash tidak boleh ikut
-- menghapus baris pesanan — riwayat belanja orang bukan milik event promo.
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_flashSaleItemId_fkey" FOREIGN KEY ("flashSaleItemId") REFERENCES "FlashSaleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
