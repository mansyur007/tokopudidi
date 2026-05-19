import { RequestHandler } from 'express';
import { prisma } from '@tokopudidi/database';
import { ForbiddenError, NotFoundError } from '../../lib/errors';

// Inject req.shop berdasarkan owner yang sedang login. Endpoint seller wajib pakai ini.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      shop?: { id: string; slug: string; ownerId: string };
    }
  }
}

export const requireShopOwner: RequestHandler = async (req, _res, next) => {
  if (!req.user) return next(new ForbiddenError('Login dulu ya'));
  if (req.user.role !== 'SELLER' && req.user.role !== 'ADMIN') {
    return next(new ForbiddenError('Akun kamu belum terdaftar sebagai penjual. Daftar dulu yuk.'));
  }
  const shop = await prisma.shop.findUnique({
    where: { ownerId: req.user.sub },
    select: { id: true, slug: true, ownerId: true },
  });
  if (!shop) return next(new NotFoundError('Toko tidak ditemukan'));
  req.shop = shop;
  next();
};
