import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { ok } from '../../lib/response';

export const categoryRouter = Router();

categoryRouter.get('/', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { order: 'asc' },
      include: { children: { where: { isActive: true }, orderBy: { order: 'asc' } } },
    });
    return ok(res, categories);
  } catch (err) {
    next(err);
  }
});
