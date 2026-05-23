import { Router } from 'express';
import { prisma } from '@tokopudidi/database';
import { categoryCreateSchema, categoryUpdateSchema, slugify } from '@tokopudidi/shared';
import { ok, created } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { NotFoundError, BadRequestError } from '../../lib/errors';

export const adminCategoryRouter = Router();
adminCategoryRouter.use(requireAuth, requireRole('ADMIN'));

async function uniqueCategorySlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let i = 1; i < 50; i++) {
    const taken = await prisma.category.findUnique({ where: { slug } });
    if (!taken) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

// GET /api/v1/admin/categories — termasuk count produk + child.
adminCategoryRouter.get('/', async (_req, res, next) => {
  try {
    const items = await prisma.category.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true, children: true } } },
    });
    return ok(res, items);
  } catch (err) { next(err); }
});

// POST /api/v1/admin/categories
adminCategoryRouter.post('/', validateBody(categoryCreateSchema), async (req, res, next) => {
  try {
    const { name, parentId, iconUrl, order, isActive } = req.body;
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) throw new BadRequestError('Kategori induk tidak valid');
    }
    const slug = await uniqueCategorySlug(name);
    const cat = await prisma.category.create({
      data: { name, slug, parentId: parentId || null, iconUrl: iconUrl || null, order, isActive },
    });
    return created(res, cat, 'Kategori ditambahkan');
  } catch (err) { next(err); }
});

// PATCH /api/v1/admin/categories/:id
adminCategoryRouter.patch('/:id', validateBody(categoryUpdateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Kategori tidak ditemukan');
    const { name, parentId, iconUrl, order, isActive } = req.body;
    if (parentId && parentId === existing.id) throw new BadRequestError('Kategori tidak bisa jadi induk dirinya sendiri');
    const cat = await prisma.category.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(parentId !== undefined ? { parentId: parentId || null } : {}),
        ...(iconUrl !== undefined ? { iconUrl: iconUrl || null } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
    return ok(res, cat, 'Kategori diupdate');
  } catch (err) { next(err); }
});

// DELETE /api/v1/admin/categories/:id — tolak kalau masih dipakai.
adminCategoryRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!existing) throw new NotFoundError('Kategori tidak ditemukan');
    if (existing._count.products > 0) throw new BadRequestError('Masih ada produk di kategori ini. Pindahkan dulu.');
    if (existing._count.children > 0) throw new BadRequestError('Masih ada subkategori. Hapus dulu subkategorinya.');
    await prisma.category.delete({ where: { id: existing.id } });
    return ok(res, null, 'Kategori dihapus');
  } catch (err) { next(err); }
});
