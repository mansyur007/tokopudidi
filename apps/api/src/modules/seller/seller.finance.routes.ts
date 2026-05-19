import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { withdrawSchema } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { requireShopOwner } from './seller.middleware';
import { validateBody } from '../../middleware/validate';
import { BadRequestError } from '../../lib/errors';

export const sellerFinanceRouter = Router();
sellerFinanceRouter.use(requireAuth, requireShopOwner);

// GET /api/v1/seller/finance — saldo + riwayat penarikan + ringkasan order belum cair.
sellerFinanceRouter.get('/', async (req, res, next) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: req.shop!.id },
      select: {
        balance: true, pendingBalance: true,
        bankName: true, bankAccountNo: true, bankAccountName: true,
      },
    });
    const withdrawals = await prisma.withdrawal.findMany({
      where: { shopId: req.shop!.id },
      orderBy: { requestedAt: 'desc' },
      take: 50,
    });
    return ok(res, { shop, withdrawals });
  } catch (err) { next(err); }
});

// POST /api/v1/seller/finance/withdraw — ajukan penarikan dana (mock)
sellerFinanceRouter.post('/withdraw', validateBody(withdrawSchema), async (req, res, next) => {
  try {
    const shop = await prisma.shop.findUnique({ where: { id: req.shop!.id } });
    if (!shop) throw new BadRequestError('Toko tidak ditemukan');
    if (!shop.bankName || !shop.bankAccountNo) {
      throw new BadRequestError('Atur dulu rekening bank di pengaturan toko');
    }
    if (req.body.amount > shop.balance) {
      throw new BadRequestError('Saldo aktif tidak cukup');
    }

    const w = await prisma.$transaction(async (tx) => {
      await tx.shop.update({
        where: { id: shop.id },
        data: { balance: { decrement: req.body.amount } },
      });
      return tx.withdrawal.create({
        data: {
          shopId: shop.id,
          amount: req.body.amount,
          bankName: shop.bankName!,
          bankAccountNo: shop.bankAccountNo!,
          status: 'PENDING',
        },
      });
    });

    // Mock: auto-PROCESSED setelah 60 detik (untuk demo, kita langsung tandai PROCESSED).
    setTimeout(() => {
      prisma.withdrawal
        .update({ where: { id: w.id }, data: { status: 'PROCESSED', processedAt: new Date() } })
        .catch(() => undefined);
    }, 60_000);

    return created(res, w, 'Permintaan tarik dana diajukan. Proses ~1 jam (demo: 60 detik)');
  } catch (err) { next(err); }
});
