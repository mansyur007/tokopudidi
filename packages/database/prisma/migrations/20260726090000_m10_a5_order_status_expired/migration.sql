-- M10-A5: status EXPIRED untuk order yang lewat batas waktu bayar QRIS (15 menit).
-- Aditif — tidak menyentuh baris existing, tidak destruktif.
ALTER TYPE "OrderStatus" ADD VALUE 'EXPIRED';
