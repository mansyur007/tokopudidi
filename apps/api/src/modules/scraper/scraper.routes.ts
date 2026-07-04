import { Router } from 'express';
import { scrapeRequestSchema } from '@tokopudidi/shared';
import { ok } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { scrapeTokopedia } from './scraper.service';

// Scraper Tokopedia — KHUSUS ADMIN. Menjalankan headless Chromium, jadi
// dilindungi ketat & dibatasi maxProducts untuk jaga beban server.
export const scraperRouter = Router();
scraperRouter.use(requireAuth, requireRole('ADMIN'));

// POST /api/v1/admin/scrape  body { url, maxProducts? }
scraperRouter.post('/', validateBody(scrapeRequestSchema), async (req, res, next) => {
  try {
    const { url, maxProducts } = req.body as { url: string; maxProducts: number };
    const result = await scrapeTokopedia(url, maxProducts);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
});
