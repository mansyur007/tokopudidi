import { prisma, Prisma } from '@tokopudidi/database';
import type { CheckoutInput } from '@tokopudidi/shared';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { quoteShipping, isCodAvailable } from '../shipping/shipping.service';

function generateOrderNumber(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `TKP-${ymd}-${rand}`;
}

export interface PromoApplied {
  code: string;
  discountAmount: number;
}

async function validatePromo(
  code: string,
  totalSubtotal: number,
): Promise<PromoApplied | null> {
  if (!code) return null;
  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.isActive) {
    throw new BadRequestError('Kode promo tidak valid');
  }
  const now = new Date();
  if (now < promo.validFrom || now > promo.validUntil) {
    throw new BadRequestError('Kode promo sudah tidak berlaku');
  }
  if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
    throw new BadRequestError('Kuota promo sudah habis');
  }
  if (totalSubtotal < promo.minPurchase) {
    throw new BadRequestError(
      `Minimal belanja Rp ${promo.minPurchase.toLocaleString('id-ID')} untuk pakai promo ini`,
    );
  }

  let discount =
    promo.discountType === 'PERCENTAGE'
      ? Math.floor((totalSubtotal * promo.discountValue) / 100)
      : promo.discountValue;
  if (promo.maxDiscount && discount > promo.maxDiscount) discount = promo.maxDiscount;
  if (discount > totalSubtotal) discount = totalSubtotal;

  return { code: promo.code, discountAmount: discount };
}

export async function checkout(userId: string, input: CheckoutInput) {
  // 1. Ambil cart user.
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: { include: { shop: true, images: { take: 1, orderBy: { order: 'asc' } } } },
          variant: true,
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) {
    throw new BadRequestError('Keranjang kosong');
  }

  // 2. Resolve alamat — wajib kecuali semua shop pakai PICKUP_SENDIRI.
  const allPickup = input.shops.every((s) => s.shippingMethod === 'PICKUP_SENDIRI');
  let address = null;
  if (!allPickup) {
    if (!input.addressId) throw new BadRequestError('Pilih alamat pengiriman dulu');
    address = await prisma.address.findFirst({
      where: { id: input.addressId, userId },
    });
    if (!address) throw new NotFoundError('Alamat tidak ditemukan');

    if (input.paymentMethod === 'COD' && !isCodAvailable(address.province)) {
      throw new BadRequestError('Maaf, COD belum tersedia di area kamu');
    }
  } else if (input.paymentMethod === 'COD') {
    throw new BadRequestError('COD tidak bisa untuk pickup sendiri');
  }

  // 3. Validasi & build order per toko.
  const cartItemMap = new Map(cart.items.map((it) => [it.id, it]));
  let combinedSubtotal = 0;
  const shopOrders: Array<{
    shopId: string;
    items: typeof cart.items;
    shippingMethod: 'REGULAR' | 'SAME_DAY' | 'PICKUP_SENDIRI';
    notes?: string;
    subtotal: number;
    weightGr: number;
    shippingCost: number;
  }> = [];

  for (const shopGroup of input.shops) {
    const items = shopGroup.cartItemIds.map((id) => cartItemMap.get(id)).filter(Boolean) as typeof cart.items;
    if (items.length === 0) {
      throw new BadRequestError('Item keranjang tidak ditemukan');
    }
    // Pastikan semua item milik shop ini.
    for (const it of items) {
      if (it.product.shopId !== shopGroup.shopId) {
        throw new BadRequestError('Ada item yang tidak cocok dengan toko');
      }
      if (!it.product.isActive || it.product.deletedAt) {
        throw new BadRequestError(`Produk "${it.product.name}" sudah tidak tersedia`);
      }
      const stockLimit = it.variant?.stock ?? it.product.stock;
      if (it.quantity > stockLimit) {
        throw new BadRequestError(`Stok ${it.product.name} tinggal ${stockLimit}`);
      }
      if (!it.product.shop.isOpen) {
        throw new BadRequestError(`Toko "${it.product.shop.name}" sedang tutup`);
      }
    }

    let subtotal = 0;
    let weightGr = 0;
    for (const it of items) {
      const price = it.product.price + (it.variant?.priceModifier ?? 0);
      subtotal += price * it.quantity;
      weightGr += it.product.weight * it.quantity;
    }

    let shippingCost = 0;
    if (shopGroup.shippingMethod !== 'PICKUP_SENDIRI') {
      if (!address) throw new BadRequestError('Alamat tujuan belum dipilih');
      shippingCost = quoteShipping(address.province, shopGroup.shippingMethod, weightGr);
    }

    combinedSubtotal += subtotal;
    shopOrders.push({
      shopId: shopGroup.shopId,
      items,
      shippingMethod: shopGroup.shippingMethod,
      notes: shopGroup.notes || undefined,
      subtotal,
      weightGr,
      shippingCost,
    });
  }

  // 4. Validasi promo (di-apply ke combined subtotal, dipotong proporsional per order).
  const promoApplied = await validatePromo(input.promoCode ?? '', combinedSubtotal);

  // 5. Buat order dalam transaksi tunggal.
  const created = await prisma.$transaction(async (tx) => {
    const orderRecords = [];
    for (const so of shopOrders) {
      // Discount proporsional berdasarkan share subtotal.
      let discount = 0;
      if (promoApplied && combinedSubtotal > 0) {
        discount = Math.floor((promoApplied.discountAmount * so.subtotal) / combinedSubtotal);
      }
      const total = so.subtotal + so.shippingCost - discount;

      const shop = await tx.shop.findUniqueOrThrow({ where: { id: so.shopId } });

      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          buyerId: userId,
          shopId: so.shopId,
          addressId: address?.id,
          status: input.paymentMethod === 'COD' ? 'PAID' : 'PENDING_PAYMENT',
          subtotal: so.subtotal,
          shippingCost: so.shippingCost,
          discountAmount: discount,
          total,
          paymentMethod: input.paymentMethod,
          shippingMethod: so.shippingMethod,
          buyerAddress: address
            ? (address as unknown as Prisma.InputJsonValue)
            : (Prisma.JsonNull as unknown as Prisma.InputJsonValue),
          shopAddress: { name: shop.name, city: shop.city, province: shop.province } as unknown as Prisma.InputJsonValue,
          notes: so.notes,
          promoCode: promoApplied?.code,
          paidAt: input.paymentMethod === 'COD' ? new Date() : null,
          items: {
            create: so.items.map((it) => ({
              productId: it.productId,
              variantId: it.variantId,
              productName: it.product.name,
              productImage: it.product.images[0]?.url ?? null,
              variantName: it.variant?.name,
              price: it.product.price + (it.variant?.priceModifier ?? 0),
              quantity: it.quantity,
              subtotal: (it.product.price + (it.variant?.priceModifier ?? 0)) * it.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // Kurangi stok produk/varian.
      for (const it of so.items) {
        if (it.variantId) {
          await tx.productVariant.update({
            where: { id: it.variantId },
            data: { stock: { decrement: it.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { decrement: it.quantity } },
          });
        }
      }

      orderRecords.push(order);
    }

    // 6. Hapus item keranjang yang sudah di-checkout.
    const usedIds = shopOrders.flatMap((s) => s.items.map((i) => i.id));
    await tx.cartItem.deleteMany({ where: { id: { in: usedIds } } });

    // 7. Increment promo usage.
    if (promoApplied) {
      await tx.promoCode.update({
        where: { code: promoApplied.code },
        data: { usedCount: { increment: 1 } },
      });
    }

    return orderRecords;
  });

  return created;
}

export async function listOrdersForBuyer(
  userId: string,
  filter: { status?: string; page: number; limit: number },
) {
  const where: Prisma.OrderWhereInput = { buyerId: userId };
  if (filter.status && filter.status !== 'ALL') {
    // Special: 'BELUM_BAYAR' alias.
    if (filter.status === 'PENDING_PAYMENT') where.status = 'PENDING_PAYMENT';
    else where.status = filter.status as Prisma.EnumOrderStatusFilter['equals'];
  }

  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      include: {
        shop: { select: { id: true, name: true, slug: true, logoUrl: true } },
        items: { take: 3 },
      },
    }),
  ]);

  return { items, total, page: filter.page, limit: filter.limit };
}

export async function getOrderForBuyer(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId: userId },
    include: {
      shop: { select: { id: true, name: true, slug: true, logoUrl: true, ownerId: true } },
      items: true,
      paymentProof: true,
      refundRequest: true,
    },
  });
  if (!order) throw new NotFoundError('Pesanan tidak ditemukan');
  return order;
}

export async function cancelOrder(userId: string, orderId: string, reason: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, buyerId: userId } });
  if (!order) throw new NotFoundError('Pesanan tidak ditemukan');

  // Hanya boleh cancel kalau belum dikirim.
  if (!['PENDING_PAYMENT', 'PAID', 'PROCESSING'].includes(order.status)) {
    throw new ForbiddenError('Pesanan tidak bisa dibatalkan di status ini');
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });
    // Restore stok.
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
  });

  return prisma.order.findUnique({ where: { id: orderId } });
}

export async function completeOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, buyerId: userId } });
  if (!order) throw new NotFoundError('Pesanan tidak ditemukan');
  if (order.status !== 'DELIVERED') {
    throw new ForbiddenError('Pesanan belum sampai. Tunggu kurir antar dulu ya.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    // Pindahkan saldo dari pending ke balance toko.
    await tx.shop.update({
      where: { id: order.shopId },
      data: {
        pendingBalance: { decrement: order.total },
        balance: { increment: order.total },
        totalSold: { increment: 1 },
      },
    });
    // Increment soldCount per produk.
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const it of items) {
      await tx.product.update({
        where: { id: it.productId },
        data: { soldCount: { increment: it.quantity } },
      }).catch(() => undefined);
    }
  });

  return prisma.order.findUnique({ where: { id: orderId } });
}

export async function uploadPaymentProof(
  userId: string,
  orderId: string,
  data: { bankName: string; accountName: string; transferAmount: number; proofImageUrl: string },
) {
  const order = await prisma.order.findFirst({ where: { id: orderId, buyerId: userId } });
  if (!order) throw new NotFoundError('Pesanan tidak ditemukan');
  if (order.paymentMethod !== 'TRANSFER_MANUAL') {
    throw new BadRequestError('Pesanan ini bukan transfer manual');
  }
  if (order.status !== 'PENDING_PAYMENT') {
    throw new BadRequestError('Pesanan ini sudah tidak butuh bukti transfer');
  }

  return prisma.paymentProof.upsert({
    where: { orderId },
    update: { ...data, uploadedAt: new Date(), rejectedAt: null, rejectReason: null },
    create: { orderId, ...data },
  });
}

// Buyer mengajukan refund. Hanya untuk pesanan yang sudah sampai/selesai dan belum pernah diajukan.
export async function requestRefund(
  userId: string,
  orderId: string,
  data: { reason: string; evidenceImages?: string[] },
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId: userId },
    include: { refundRequest: true },
  });
  if (!order) throw new NotFoundError('Pesanan tidak ditemukan');
  if (!['DELIVERED', 'COMPLETED'].includes(order.status)) {
    throw new BadRequestError('Refund hanya bisa diajukan setelah pesanan sampai');
  }
  if (order.refundRequest) {
    throw new BadRequestError('Kamu sudah pernah mengajukan refund untuk pesanan ini');
  }

  const refund = await prisma.refundRequest.create({
    data: {
      orderId,
      requestedById: userId,
      reason: data.reason,
      evidenceImages: data.evidenceImages ?? [],
    },
  });

  // Beri tahu seller toko terkait.
  const shop = await prisma.shop.findUnique({ where: { id: order.shopId }, select: { ownerId: true } });
  if (shop) {
    await prisma.notification.create({
      data: {
        userId: shop.ownerId,
        type: 'ORDER_UPDATE',
        title: 'Ada pengajuan refund',
        body: `Pembeli mengajukan refund untuk pesanan ${order.orderNumber}. Admin akan meninjau.`,
        linkUrl: `/seller/pesanan/${order.id}`,
      },
    });
  }
  return refund;
}
