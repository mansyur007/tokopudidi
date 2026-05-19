import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { addressInputSchema } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { NotFoundError } from '../../lib/errors';

export const addressRouter = Router();
addressRouter.use(requireAuth);

addressRouter.get('/', async (req, res, next) => {
  try {
    const items = await prisma.address.findMany({
      where: { userId: req.user!.sub },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return ok(res, items);
  } catch (err) { next(err); }
});

addressRouter.post('/', validateBody(addressInputSchema), async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const isDefault = req.body.isDefault ?? false;

    // Kalau ini set default, kosongkan default lama.
    if (isDefault) {
      await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    } else {
      // Kalau user belum punya alamat sama sekali, otomatis jadikan default.
      const count = await prisma.address.count({ where: { userId } });
      if (count === 0) req.body.isDefault = true;
    }

    const item = await prisma.address.create({
      data: { ...req.body, userId },
    });
    return created(res, item, 'Alamat berhasil disimpan');
  } catch (err) { next(err); }
});

addressRouter.patch('/:id', validateBody(addressInputSchema.partial()), async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw new NotFoundError('Alamat tidak ditemukan');

    if (req.body.isDefault === true) {
      await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }

    const item = await prisma.address.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return ok(res, item, 'Alamat berhasil diupdate');
  } catch (err) { next(err); }
});

addressRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw new NotFoundError('Alamat tidak ditemukan');
    await prisma.address.delete({ where: { id: req.params.id } });

    // Kalau yang dihapus adalah default, jadikan alamat lain default-nya.
    if (existing.isDefault) {
      const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
      if (next) {
        await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
    return ok(res, null, 'Alamat dihapus');
  } catch (err) { next(err); }
});
