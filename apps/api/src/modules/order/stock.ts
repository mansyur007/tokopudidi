import { Prisma } from '@tokopudidi/database';

/**
 * Kembalikan stok produk/varian dari item sebuah order — sekaligus lepaskan
 * kuota flash sale (M15-C1) yang dipakai item-item itu.
 *
 * Dipakai setiap kali pesanan batal jalan: dibatalkan pembeli (`cancelOrder`),
 * kedaluwarsa karena tidak dibayar (`expireOrderIfDue`, M10-A5), maupun direfund
 * (`settleOrderRefund`, M4 + M10-A7). Kuota flash menumpang di fungsi yang sama
 * dan bukan di ketiga pemanggilnya, dengan alasan yang sama seperti stok:
 * begitu ada jalur pembatalan keempat, ia ikut benar tanpa harus diingat.
 *
 * Harus dipanggil di dalam transaksi. Kegagalan per item sengaja ditelan —
 * produk/varian bisa saja sudah dihapus, dan itu tidak boleh menggagalkan
 * pembatalan pesanan.
 */
export async function restoreStock(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const it of items) {
    if (it.variantId) {
      await tx.productVariant.update({
        where: { id: it.variantId },
        data: { stock: { increment: it.quantity } },
      }).catch(() => undefined);
    } else {
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: { increment: it.quantity } },
      }).catch(() => undefined);
    }

    // Hanya baris yang benar-benar membayar harga flash yang punya snapshot ini.
    if (it.flashSaleItemId) {
      // Syarat `gte` menjaga `soldCount` tidak pernah jadi negatif kalau fungsi
      // ini sampai terpanggil dua kali untuk pesanan yang sama — kuota yang
      // minus akan menjual unit gratis di event berikutnya.
      await tx.flashSaleItem.updateMany({
        where: { id: it.flashSaleItemId, soldCount: { gte: it.quantity } },
        data: { soldCount: { decrement: it.quantity } },
      }).catch(() => undefined);
    }
  }
}
