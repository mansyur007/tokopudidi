-- M13-B2: broadcast promo toko ke follower.
-- Aditif murni: satu nilai enum baru + satu tabel riwayat baru. Tidak ada
-- kolom/baris existing yang disentuh.

-- Postgres 15 mengizinkan ADD VALUE di dalam transaksi (batasannya cuma:
-- nilai baru tidak boleh DIPAKAI pada transaksi yang sama) — migration ini
-- hanya mendeklarasikannya, penulisan notifikasi terjadi di runtime.
ALTER TYPE "NotificationType" ADD VALUE 'SHOP_BROADCAST';

CREATE TABLE "ShopBroadcast" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "productId" TEXT,
    -- Jangkauan saat kirim; dibekukan supaya riwayat tidak berubah arti ketika
    -- jumlah follower bergerak setelahnya.
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopBroadcast_pkey" PRIMARY KEY ("id")
);

-- Dipakai dua kali: riwayat per toko (terbaru dulu) dan cek rate limit 24 jam.
CREATE INDEX "ShopBroadcast_shopId_sentAt_idx" ON "ShopBroadcast"("shopId", "sentAt");

ALTER TABLE "ShopBroadcast" ADD CONSTRAINT "ShopBroadcast_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SET NULL, bukan CASCADE: menghapus produk tidak boleh ikut menghapus baris
-- riwayat, karena baris itulah yang menahan jendela 24 jam berikutnya.
ALTER TABLE "ShopBroadcast" ADD CONSTRAINT "ShopBroadcast_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
