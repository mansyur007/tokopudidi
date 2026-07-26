-- M10-A10: kolom pendukung filter pencarian lengkap.
-- Semua aditif dengan default, jadi baris existing tetap valid.

-- Official Store: di-set admin, dipakai filter pencarian (badge menyusul di M14-B1).
ALTER TABLE "Shop" ADD COLUMN "isOfficialStore" BOOLEAN NOT NULL DEFAULT false;

-- Opsi pengiriman per produk. codAvailable default true supaya produk lama
-- tidak mendadak kehilangan opsi COD yang selama ini tersedia.
ALTER TABLE "Product" ADD COLUMN "codAvailable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN "freeShippingEligible" BOOLEAN NOT NULL DEFAULT false;
