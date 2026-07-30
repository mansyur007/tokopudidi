import { Router } from 'express';
import { scrapeRequestSchema } from '@tokopudidi/shared';
import { ok } from '../../lib/response';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { scrapeTokopedia } from './scraper.service';
import { logAdmin } from '../../lib/adminLog';

// Scraper Tokopedia — KHUSUS ADMIN. Menjalankan headless Chromium, jadi
// dilindungi ketat & dibatasi maxProducts untuk jaga beban server.
export const scraperRouter = Router();
scraperRouter.use(requireAuth, requireRole('ADMIN'));

// POST /api/v1/admin/scrape  body { url, maxProducts? }
scraperRouter.post('/', validateBody(scrapeRequestSchema), async (req, res, next) => {
  try {
    const { url, maxProducts } = req.body as { url: string; maxProducts: number };
    const result = await scrapeTokopedia(url, maxProducts);
    // Tidak menulis data kita, tapi menjalankan headless browser ke pihak ketiga
    // atas nama platform — justru jenis aksi yang audit log ada untuknya.
    // Di luar inventaris ROADMAP; ditambahkan sengaja, lihat catatan PR.
    logAdmin(req.user!.sub, 'SCRAPE_TOKOPEDIA', {
      payload: { url, maxProducts },
      note: `${result.products.length} produk terbaca`,
    });
    return ok(res, result);
  } catch (err) {
    next(err);
  }
});
