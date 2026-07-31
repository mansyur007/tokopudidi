-- M13-A1: follow / favorit toko.
-- Aditif murni — satu tabel join baru, tidak menyentuh tabel existing.

CREATE TABLE "ShopFollower" (
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- PK gabungan sekaligus jadi penjaga anti-duplikat: klik ganda pada tombol
    -- Follow menabrak baris yang sama, bukan menambah follower kedua.
    CONSTRAINT "ShopFollower_pkey" PRIMARY KEY ("shopId","userId")
);

-- Halaman /akun/toko-favorit: daftar toko yang di-follow user, terbaru dulu.
CREATE INDEX "ShopFollower_userId_createdAt_idx" ON "ShopFollower"("userId", "createdAt");

-- Toko dihapus/user dihapus -> baris follow ikut bersih; tidak ada data yatim
-- yang bisa mengacaukan hitungan follower.
ALTER TABLE "ShopFollower" ADD CONSTRAINT "ShopFollower_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShopFollower" ADD CONSTRAINT "ShopFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
