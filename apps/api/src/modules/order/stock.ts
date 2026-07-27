import { Prisma } from '@tokopudidi/database';

/**
 * Kembalikan stok produk/varian dari item sebuah order.
 *
 * Dipakai setiap kali pesanan batal jalan: dibatalkan pembeli (`cancelOrder`),
 * kedaluwarsa karena tidak dibayar (`expireOrderIfDue`, M10-A5), maupun direfund
 * (`settleOrderRefund`, M4 + M10-A7).
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
  }
}
