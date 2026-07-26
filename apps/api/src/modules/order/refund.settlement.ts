import { Prisma } from '@tokopudidi/database';

/**
 * Beresi sisi uang & stok saat sebuah pesanan direfund penuh:
 * kembalikan stok, tarik balik saldo seller, lalu set order jadi REFUNDED.
 *
 * Dipakai dua jalur yang berujung sama — admin menyetujui `RefundRequest`
 * (M4) dan komplain yang berakhir REFUND (M10-A7) — supaya aturan saldo
 * hanya hidup di satu tempat.
 *
 * Harus dipanggil di dalam transaksi.
 */
export async function settleOrderRefund(
  tx: Prisma.TransactionClient,
  order: { id: string; shopId: string; status: string; total: number },
): Promise<void> {
  const items = await tx.orderItem.findMany({ where: { orderId: order.id } });

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

  // Dana pesanan COMPLETED sudah pindah ke balance; selain itu masih pendingBalance.
  if (order.status === 'COMPLETED') {
    await tx.shop.update({
      where: { id: order.shopId },
      data: { balance: { decrement: order.total }, totalSold: { decrement: 1 } },
    });
    for (const it of items) {
      await tx.product.update({
        where: { id: it.productId },
        data: { soldCount: { decrement: it.quantity } },
      }).catch(() => undefined);
    }
  } else if (['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
    await tx.shop.update({
      where: { id: order.shopId },
      data: { pendingBalance: { decrement: order.total } },
    });
  }

  await tx.order.update({ where: { id: order.id }, data: { status: 'REFUNDED' } });
}
