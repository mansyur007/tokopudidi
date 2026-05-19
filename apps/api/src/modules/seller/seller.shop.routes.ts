// Endpoint untuk upgrade buyer → seller dan manajemen profil toko sendiri.
import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { upgradeToSellerSchema, updateShopSchema, slugify } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { ConflictError, BadRequestError } from '../../lib/errors';
import { requireShopOwner } from './seller.middleware';

export const sellerShopRouter = Router();

// POST /api/v1/users/me/upgrade-to-seller — bisa diakses BUYER yang belum punya toko.
sellerShopRouter.post(
  '/upgrade-to-seller',
  requireAuth,
  validateBody(upgradeToSellerSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const existingShop = await prisma.shop.findUnique({ where: { ownerId: userId } });
      if (existingShop) throw new ConflictError('Kamu sudah punya toko');

      const baseSlug = slugify(req.body.shopName);
      let slug = baseSlug;
      // Kalau slug bentrok, tambah suffix angka.
      for (let i = 1; i < 20; i++) {
        const taken = await prisma.shop.findUnique({ where: { slug } });
        if (!taken) break;
        slug = `${baseSlug}-${i}`;
      }
      const finalCheck = await prisma.shop.findUnique({ where: { slug } });
      if (finalCheck) throw new BadRequestError('Nama toko sudah dipakai. Coba nama lain ya.');

      const result = await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: userId }, data: { role: 'SELLER' } });
        const shop = await tx.shop.create({
          data: {
            ownerId: userId,
            slug,
            name: req.body.shopName,
            description: req.body.shopDescription || null,
            province: req.body.province,
            city: req.body.city,
            ktpUrl: req.body.ktpUrl,
            ktpVerified: false,
          },
        });
        return shop;
      });
      return created(res, result, 'Toko berhasil dibuka! Tunggu verifikasi KTP ya.');
    } catch (err) { next(err); }
  },
);

// GET /api/v1/seller/shop — toko milik seller saat ini
sellerShopRouter.get('/shop', requireAuth, requireShopOwner, async (req, res, next) => {
  try {
    const shop = await prisma.shop.findUnique({ where: { id: req.shop!.id } });
    return ok(res, shop);
  } catch (err) { next(err); }
});

// PATCH /api/v1/seller/shop
sellerShopRouter.patch(
  '/shop',
  requireAuth,
  requireShopOwner,
  validateBody(updateShopSchema),
  async (req, res, next) => {
    try {
      const data: Record<string, unknown> = { ...req.body };
      // Empty string → null untuk field optional.
      for (const k of Object.keys(data)) {
        if (data[k] === '') data[k] = null;
      }
      const shop = await prisma.shop.update({
        where: { id: req.shop!.id },
        data,
      });
      return ok(res, shop, 'Profil toko berhasil disimpan');
    } catch (err) { next(err); }
  },
);

// POST /api/v1/seller/shop/toggle-open
sellerShopRouter.post(
  '/shop/toggle-open',
  requireAuth,
  requireShopOwner,
  async (req, res, next) => {
    try {
      const current = await prisma.shop.findUnique({ where: { id: req.shop!.id } });
      if (!current) throw new BadRequestError('Toko tidak ditemukan');
      const reason = (req.body?.reason as string | undefined)?.trim() || null;
      const shop = await prisma.shop.update({
        where: { id: req.shop!.id },
        data: {
          isOpen: !current.isOpen,
          closedReason: !current.isOpen ? null : reason,
        },
      });
      return ok(res, shop, shop.isOpen ? 'Toko sekarang buka' : 'Toko ditutup sementara');
    } catch (err) { next(err); }
  },
);
