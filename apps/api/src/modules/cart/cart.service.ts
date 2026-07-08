import { prisma } from '@tokopudidi/database';
import { getEffectivePrice } from '@tokopudidi/shared';
import { BadRequestError, NotFoundError } from '../../lib/errors';

// Cart dijamin ada (auto-create di register). Tapi defensive: upsert kalau belum ada.
async function ensureCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function getCartForUser(userId: string) {
  await ensureCart(userId);
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { addedAt: 'desc' },
        include: {
          product: {
            select: {
              id: true, name: true, slug: true, price: true, stock: true,
              salePrice: true, saleStartAt: true, saleEndAt: true,
              isActive: true, weight: true,
              images: { orderBy: { order: 'asc' }, take: 1 },
              shop:   { select: { id: true, name: true, slug: true, isOpen: true } },
            },
          },
          variant: { select: { id: true, name: true, priceModifier: true, stock: true } },
        },
      },
    },
  });
  if (!cart) return { items: [], grouped: [] };

  // Effective price (base termasuk sale M9-B3 + variant modifier).
  const items = cart.items.map((it) => {
    const effectivePrice = getEffectivePrice(it.product) + (it.variant?.priceModifier ?? 0);
    return {
      id: it.id,
      productId: it.productId,
      variantId: it.variantId,
      quantity: it.quantity,
      addedAt: it.addedAt,
      price: effectivePrice,
      subtotal: effectivePrice * it.quantity,
      product: {
        id: it.product.id,
        name: it.product.name,
        slug: it.product.slug,
        imageUrl: it.product.images[0]?.url ?? null,
        stock: it.product.stock,
        isActive: it.product.isActive,
        weight: it.product.weight,
      },
      variant: it.variant
        ? { id: it.variant.id, name: it.variant.name, stock: it.variant.stock }
        : null,
      shop: it.product.shop,
    };
  });

  // Group per toko — sesuai aturan checkout 1 toko = 1 order.
  const groupedMap = new Map<string, { shop: typeof items[0]['shop']; items: typeof items }>();
  for (const it of items) {
    const g = groupedMap.get(it.shop.id);
    if (g) g.items.push(it);
    else groupedMap.set(it.shop.id, { shop: it.shop, items: [it] });
  }
  const grouped = Array.from(groupedMap.values());

  return { items, grouped };
}

export async function addItem(userId: string, input: {
  productId: string;
  variantId?: string;
  quantity: number;
}) {
  const cart = await ensureCart(userId);

  // Validasi produk & stok.
  const product = await prisma.product.findFirst({
    where: { id: input.productId, isActive: true, deletedAt: null },
    include: { variants: true },
  });
  if (!product) throw new NotFoundError('Produk tidak ditemukan');

  if (input.variantId) {
    const variant = product.variants.find((v) => v.id === input.variantId);
    if (!variant) throw new BadRequestError('Varian tidak valid untuk produk ini');
    if (variant.stock < input.quantity) {
      throw new BadRequestError(`Stok varian "${variant.name}" tinggal ${variant.stock}`);
    }
  } else {
    if (product.stock < input.quantity) {
      throw new BadRequestError(`Stok tinggal ${product.stock}`);
    }
    // Jika produk punya varian, wajib pilih.
    if (product.variants.length > 0) {
      throw new BadRequestError('Pilih varian dulu ya');
    }
  }
  if (input.quantity < product.minOrderQty) {
    throw new BadRequestError(`Minimal beli ${product.minOrderQty} dulu`);
  }

  // Kalau item dengan productId+variantId yang sama sudah ada → tambah quantity.
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId: input.productId, variantId: input.variantId ?? null },
  });

  if (existing) {
    return prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + input.quantity },
    });
  }

  return prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: input.productId,
      variantId: input.variantId,
      quantity: input.quantity,
    },
  });
}

export async function updateItemQty(userId: string, itemId: string, quantity: number) {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    include: { product: true, variant: true },
  });
  if (!item) throw new NotFoundError('Item keranjang tidak ditemukan');

  const stockLimit = item.variant?.stock ?? item.product.stock;
  if (quantity > stockLimit) {
    throw new BadRequestError(`Stok tinggal ${stockLimit}`);
  }
  return prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
}

export async function removeItem(userId: string, itemId: string) {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
  });
  if (!item) throw new NotFoundError('Item keranjang tidak ditemukan');
  await prisma.cartItem.delete({ where: { id: itemId } });
}
