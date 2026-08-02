import { prisma, Prisma } from '@tokopudidi/database';
import type { OrderStatus, PaymentMethod } from '@tokopudidi/database';
import { resolveUnitPrice } from '@tokopudidi/shared';
import type { CheckoutInput } from '@tokopudidi/shared';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { quoteShipping, isCodAvailable } from '../shipping/shipping.service';
import { resolveFlashPrices, reserveFlashQuota } from '../flashSale/flashSale.service';
import { restoreStock } from './stock';
import {
  QRIS_EXPIRY_MINUTES,
  qrisExpiresAt,
  generateQrisPayment,
  markOrderAsPaid,
} from '../payment/payment.service';

function generateOrderNumber(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `TKP-${ymd}-${rand}`;
}

export interface PromoApplied {
  code: string;
  discountAmount: number;
  // Terisi kalau voucher khusus toko (M9-B2) — diskon hanya dipotong ke order toko ini.
  shopId: string | null;
}

async function validatePromo(
  tx: Prisma.TransactionClient,
  code: string,
  totalSubtotal: number,
  shopSubtotals: Map<string, number>,
): Promise<PromoApplied | null> {
  if (!code) return null;
  const promo = await tx.promoCode.findUnique({
    where: { code },
    include: { shop: { select: { name: true } } },
  });
  if (!promo || !promo.isActive) {
    throw new BadRequestError('Kode promo tidak valid');
  }
  // Voucher toko: basis diskon & min belanja = subtotal toko tsb saja.
  let baseSubtotal = totalSubtotal;
  if (promo.shopId) {
    const shopSubtotal = shopSubtotals.get(promo.shopId);
    if (shopSubtotal === undefined) {
      throw new BadRequestError(`Voucher ini khusus belanja di toko ${promo.shop?.name ?? 'tertentu'}`);
    }
    baseSubtotal = shopSubtotal;
  }
  const now = new Date();
  if (now < promo.validFrom || now > promo.validUntil) {
    throw new BadRequestError('Kode promo sudah tidak berlaku');
  }
  if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
    throw new BadRequestError('Kuota promo sudah habis');
  }
  if (baseSubtotal < promo.minPurchase) {
    throw new BadRequestError(
      `Minimal belanja Rp ${promo.minPurchase.toLocaleString('id-ID')} untuk pakai promo ini`,
    );
  }

  let discount =
    promo.discountType === 'PERCENTAGE'
      ? Math.floor((baseSubtotal * promo.discountValue) / 100)
      : promo.discountValue;
  if (promo.maxDiscount && discount > promo.maxDiscount) discount = promo.maxDiscount;
  if (discount > baseSubtotal) discount = baseSubtotal;

  return { code: promo.code, discountAmount: discount, shopId: promo.shopId };
}

export async function checkout(userId: string, input: CheckoutInput) {
  // 1. Ambil cart user.
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              shop: true,
              images: { take: 1, orderBy: { order: 'asc' } },
              // Harga grosir (M13-B1) — ikut menentukan snapshot OrderItem.price.
              wholesaleTiers: { select: { minQty: true, price: true } },
            },
          },
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
  //
  // Subtotal SENGAJA belum dihitung di sini. Sejak M15-C1 harga satuan bisa
  // berubah di detik terakhir — slot flash yang kuotanya keburu diambil orang
  // lain membuat item itu jatuh ke harga normal — dan angka itu baru pasti
  // setelah kuotanya benar-benar dipesan di dalam transaksi. Menghitung subtotal
  // di luar transaksi berarti `Order.total` bisa tidak sama dengan jumlah
  // item-nya persis pada kasus yang paling sulit ditelusuri.
  const cartItemMap = new Map(cart.items.map((it) => [it.id, it]));
  const shopOrders: Array<{
    shopId: string;
    items: typeof cart.items;
    shippingMethod: 'REGULAR' | 'SAME_DAY' | 'PICKUP_SENDIRI';
    notes?: string;
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
      // Seller bisa menutup opsi COD per produk (M10-A10) — flag yang sama dipakai
      // filter pencarian, jadi harus ditegakkan di sini supaya tidak jadi janji kosong.
      if (input.paymentMethod === 'COD' && !it.product.codAvailable) {
        throw new BadRequestError(`Produk "${it.product.name}" tidak bisa dibayar COD`);
      }
    }

    let weightGr = 0;
    for (const it of items) {
      weightGr += it.product.weight * it.quantity;
    }

    // Bebas ongkir (M10-A10): gratis hanya kalau semua item toko ini memang
    // ditandai bebas ongkir oleh seller — campur dengan produk biasa tetap bayar.
    const semuaBebasOngkir = items.every((it) => it.product.freeShippingEligible);

    let shippingCost = 0;
    if (shopGroup.shippingMethod !== 'PICKUP_SENDIRI') {
      if (!address) throw new BadRequestError('Alamat tujuan belum dipilih');
      shippingCost = semuaBebasOngkir
        ? 0
        : quoteShipping(address.province, shopGroup.shippingMethod, weightGr);
    }

    shopOrders.push({
      shopId: shopGroup.shopId,
      items,
      shippingMethod: shopGroup.shippingMethod,
      notes: shopGroup.notes || undefined,
      weightGr,
      shippingCost,
    });
  }

  // 4. Calon harga flash sale (M15-C1) — dibaca di luar transaksi karena ini
  //    baru pencarian kandidat; yang mengikat adalah pemesanan kuota di bawah.
  const flashHits = await resolveFlashPrices(
    Array.from(new Set(cart.items.map((it) => it.productId))),
  );

  // 5. Harga, promo, dan pembuatan order — satu transaksi.
  const created = await prisma.$transaction(async (tx) => {
    // 5a. Harga satuan final per item keranjang. Di sinilah kuota flash dipesan:
    //     kalau kalah balapan, item itu jatuh ke harga normal dan checkout
    //     TETAP jalan — kuota habis bukan alasan menggagalkan belanja orang.
    const hargaPerItem = new Map<string, { price: number; flashSaleItemId: string | null }>();
    for (const so of shopOrders) {
      for (const it of so.items) {
        const hit = flashHits.get(it.productId);
        let hasil = resolveUnitPrice(
          { ...it.product, flashPrice: hit?.salePrice ?? null },
          it.quantity,
        );
        let flashSaleItemId: string | null = null;

        if (hasil.source === 'FLASH' && hit) {
          if (await reserveFlashQuota(tx, hit.flashSaleItemId, it.quantity)) {
            flashSaleItemId = hit.flashSaleItemId;
          } else {
            // Kuota keburu diambil orang lain — hitung ulang tanpa flash.
            hasil = resolveUnitPrice({ ...it.product, flashPrice: null }, it.quantity);
          }
        }

        hargaPerItem.set(it.id, {
          price: hasil.price + (it.variant?.priceModifier ?? 0),
          flashSaleItemId,
        });
      }
    }

    const subtotalPerToko = new Map(
      shopOrders.map((so) => [
        so.shopId,
        so.items.reduce((sum, it) => sum + hargaPerItem.get(it.id)!.price * it.quantity, 0),
      ]),
    );
    const combinedSubtotal = Array.from(subtotalPerToko.values()).reduce((a, b) => a + b, 0);

    // 5b. Validasi promo. Voucher platform → combined subtotal (dipotong proporsional
    //     per order); voucher toko (M9-B2) → hanya subtotal & order toko tsb.
    const promoApplied = await validatePromo(
      tx,
      input.promoCode ?? '',
      combinedSubtotal,
      subtotalPerToko,
    );

    const orderRecords = [];
    for (const so of shopOrders) {
      const subtotal = subtotalPerToko.get(so.shopId)!;
      // Voucher toko: diskon penuh ke order toko tsb; platform: proporsional per share subtotal.
      let discount = 0;
      if (promoApplied && promoApplied.shopId) {
        discount = promoApplied.shopId === so.shopId ? promoApplied.discountAmount : 0;
      } else if (promoApplied && combinedSubtotal > 0) {
        discount = Math.floor((promoApplied.discountAmount * subtotal) / combinedSubtotal);
      }
      const total = subtotal + so.shippingCost - discount;

      const shop = await tx.shop.findUniqueOrThrow({ where: { id: so.shopId } });

      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          buyerId: userId,
          shopId: so.shopId,
          addressId: address?.id,
          status: input.paymentMethod === 'COD' ? 'PAID' : 'PENDING_PAYMENT',
          subtotal,
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
            create: so.items.map((it) => {
              // Angka yang sama persis dengan yang dipakai menyusun `subtotal`
              // di atas — dibaca dari satu peta, bukan dihitung ulang. Rumus
              // yang ditulis dua kali adalah cara paling gampang membuat total
              // order tidak sama dengan jumlah itemnya.
              const { price, flashSaleItemId } = hargaPerItem.get(it.id)!;
              return {
                productId: it.productId,
                variantId: it.variantId,
                productName: it.product.name,
                productImage: it.product.images[0]?.url ?? null,
                variantName: it.variant?.name,
                price,
                quantity: it.quantity,
                subtotal: price * it.quantity,
                // Snapshot (M15-B1) — lead time saat ini, bukan referensi hidup
                // ke produk: seller mengubahnya nanti tidak boleh mengubah
                // estimasi pada pesanan yang sudah dibuat.
                preorderDays: it.product.isPreorder ? it.product.preorderDays : null,
                flashSaleItemId,
              };
            }),
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

/**
 * Sapu order QRIS milik satu buyer yang sudah lewat batas bayar. Dipanggil saat buyer
 * membuka daftar pesanan supaya list tidak menampilkan "Belum Bayar" yang sebenarnya mati.
 * Umumnya 0 baris, jadi murah.
 */
async function expireStaleQrisOrders(userId: string) {
  const stale = await prisma.order.findMany({
    where: {
      buyerId: userId,
      status: 'PENDING_PAYMENT',
      paymentMethod: 'QRIS_MOCK',
      createdAt: { lt: new Date(Date.now() - QRIS_EXPIRY_MINUTES * 60 * 1000) },
    },
    select: { id: true, status: true, paymentMethod: true, createdAt: true },
  });
  for (const order of stale) await expireOrderIfDue(order);
}

export async function listOrdersForBuyer(
  userId: string,
  filter: { status?: string; page: number; limit: number },
) {
  await expireStaleQrisOrders(userId);

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
  const include = {
    shop: { select: { id: true, name: true, slug: true, logoUrl: true, ownerId: true } },
    items: true,
    paymentProof: true,
    refundRequest: true,
  } satisfies Prisma.OrderInclude;

  const order = await prisma.order.findFirst({ where: { id: orderId, buyerId: userId }, include });
  if (!order) throw new NotFoundError('Pesanan tidak ditemukan');

  // Lazy-expire QRIS yang lewat batas bayar (M10-A5) — baca ulang supaya status terkirim akurat.
  if (await expireOrderIfDue(order)) {
    return prisma.order.findFirstOrThrow({ where: { id: orderId, buyerId: userId }, include });
  }
  return order;
}

/**
 * Lazy-expire (M10-A5): order QRIS yang lewat batas bayar 15 menit ditandai EXPIRED
 * saat dibaca — dipilih daripada cron supaya tidak menambah proses di VPS 2-vCPU.
 * Konsekuensinya order baru berpindah status ketika ada yang membukanya; itu cukup
 * karena stok baru benar-benar dibutuhkan saat ada pembeli lain yang checkout.
 * Mengembalikan `true` kalau order barusan di-expire.
 */
export async function expireOrderIfDue(
  order: { id: string; status: OrderStatus; paymentMethod: PaymentMethod; createdAt: Date },
  now: Date = new Date(),
): Promise<boolean> {
  if (order.status !== 'PENDING_PAYMENT' || order.paymentMethod !== 'QRIS_MOCK') return false;
  if (now < qrisExpiresAt(order.createdAt)) return false;

  return prisma.$transaction(async (tx) => {
    // Guard race dengan simulate-paid: hanya menang kalau statusnya masih PENDING_PAYMENT.
    const res = await tx.order.updateMany({
      where: { id: order.id, status: 'PENDING_PAYMENT' },
      data: {
        status: 'EXPIRED',
        cancelledAt: now,
        cancelReason: 'Batas waktu pembayaran QRIS terlewat',
      },
    });
    if (res.count === 0) return false;
    await restoreStock(tx, order.id);
    return true;
  });
}

/** Data QR untuk halaman bayar. Sekalian lazy-expire kalau batas waktu sudah lewat. */
export async function getQrisPayment(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, buyerId: userId } });
  if (!order) throw new NotFoundError('Pesanan tidak ditemukan');
  if (order.paymentMethod !== 'QRIS_MOCK') {
    throw new BadRequestError('Pesanan ini tidak dibayar dengan QRIS');
  }
  await expireOrderIfDue(order);
  return generateQrisPayment(order);
}

/**
 * Simulasi pembayaran QRIS — pengganti webhook PSP selama masih mock.
 * Di production titik ini diganti handler webhook provider, bukan endpoint buyer.
 */
export async function simulateQrisPaid(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, buyerId: userId } });
  if (!order) throw new NotFoundError('Pesanan tidak ditemukan');
  if (order.paymentMethod !== 'QRIS_MOCK') {
    throw new BadRequestError('Pesanan ini tidak dibayar dengan QRIS');
  }
  if (order.status !== 'PENDING_PAYMENT') {
    throw new BadRequestError(
      order.status === 'EXPIRED'
        ? 'Batas waktu pembayaran sudah lewat. Silakan pesan ulang ya.'
        : 'Pesanan ini sudah tidak menunggu pembayaran',
    );
  }
  if (new Date() >= qrisExpiresAt(order.createdAt)) {
    await expireOrderIfDue(order);
    throw new BadRequestError('Batas waktu pembayaran sudah lewat. Silakan pesan ulang ya.');
  }

  await markOrderAsPaid(order.id);
  return prisma.order.findUnique({ where: { id: orderId } });
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
    await restoreStock(tx, orderId);
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
