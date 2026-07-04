import { chromium, type Browser, type Page } from 'playwright';
import type { ScrapedProduct, ScrapedShop, ScrapeResult } from '@tokopudidi/shared';
import { BadRequestError } from '../../lib/errors';
import { logger } from '../../lib/logger';

// ============================================================
// Scraper Tokopedia (headless Chromium via Playwright)
// ------------------------------------------------------------
// Strategi tahan-banting: utamakan baca JSON-LD (schema.org Product /
// BreadcrumbList) yang Tokopedia sematkan di tiap halaman produk — jauh
// lebih stabil daripada selector CSS yang sering berubah. Fallback ke
// meta og: dan DOM bila JSON-LD tidak ada.
//
// Catatan realistis: Tokopedia punya proteksi anti-bot. Bila diblokir,
// service melempar error yang jelas, bukan diam-diam mengembalikan kosong.
// ============================================================

const NAV_TIMEOUT = 30_000;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Path pertama URL toko yang BUKAN slug produk (halaman toko internal).
const NON_PRODUCT_SEGMENTS = new Set([
  'product', 'review', 'etalase', 'about', 'note', 'info', 'feed',
  'discussion', 'campaign', 'promo', 'find', 'search',
]);

interface JsonLdProduct {
  '@type'?: string | string[];
  name?: string;
  description?: string;
  image?: string | string[];
  sku?: string;
  offers?: {
    price?: string | number;
    priceCurrency?: string;
    availability?: string;
  };
  aggregateRating?: { ratingValue?: string | number; reviewCount?: string | number };
  brand?: { name?: string } | string;
}

function typeMatches(t: JsonLdProduct['@type'], want: string): boolean {
  if (!t) return false;
  return Array.isArray(t) ? t.includes(want) : t === want;
}

function parseIntSafe(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : undefined;
}

function shopSlugFromUrl(rawUrl: string): { slug: string; isProductUrl: boolean } {
  const u = new URL(rawUrl);
  const segments = u.pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    throw new BadRequestError('URL harus menunjuk ke halaman toko, contoh: https://www.tokopedia.com/xiaomi');
  }
  const isProductUrl =
    segments.length >= 2 && !NON_PRODUCT_SEGMENTS.has(segments[1].toLowerCase());
  return { slug: segments[0], isProductUrl };
}

// Ambil semua blok JSON-LD dari halaman aktif.
async function readJsonLd(page: Page): Promise<JsonLdProduct[]> {
  const raw = await page.$$eval('script[type="application/ld+json"]', (nodes) =>
    nodes.map((n) => n.textContent ?? ''),
  );
  const out: JsonLdProduct[] = [];
  for (const text of raw) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) out.push(...parsed);
      else if (parsed['@graph']) out.push(...parsed['@graph']);
      else out.push(parsed);
    } catch {
      /* JSON-LD rusak → abaikan */
    }
  }
  return out;
}

function pickImages(image: JsonLdProduct['image']): string[] {
  const arr = Array.isArray(image) ? image : image ? [image] : [];
  return arr
    .filter((u) => typeof u === 'string' && /^https?:\/\//.test(u))
    .slice(0, 5);
}

// Ekstrak satu produk dari halaman detail yang sudah dibuka.
async function extractProduct(page: Page, sourceUrl: string, warnings: string[]): Promise<ScrapedProduct | null> {
  const blocks = await readJsonLd(page);
  const product = blocks.find((b) => typeMatches(b['@type'], 'Product'));

  // Kategori dari BreadcrumbList (item terakhir yang bukan produk).
  const breadcrumb = blocks.find((b) => typeMatches(b['@type'], 'BreadcrumbList')) as
    | { itemListElement?: Array<{ name?: string; item?: { name?: string } }> }
    | undefined;
  let categoryHint: string | undefined;
  if (breadcrumb?.itemListElement?.length) {
    const items = breadcrumb.itemListElement;
    const cat = items[items.length - 2] ?? items[items.length - 1];
    categoryHint = cat?.name ?? cat?.item?.name;
  }

  // Fallback nama/gambar/harga dari meta jika JSON-LD tak lengkap.
  const meta = await page.evaluate(() => {
    const get = (sel: string) => document.querySelector(sel)?.getAttribute('content') ?? undefined;
    return {
      ogTitle: get('meta[property="og:title"]'),
      ogImage: get('meta[property="og:image"]'),
      ogDesc: get('meta[property="og:description"]'),
    };
  });

  const name = (product?.name ?? meta.ogTitle ?? '').trim();
  if (!name) {
    warnings.push(`Produk dilewati (nama tidak terbaca): ${sourceUrl}`);
    return null;
  }

  const price = parseIntSafe(product?.offers?.price);
  if (!price) {
    warnings.push(`Produk "${name}" dilewati (harga tidak terbaca)`);
    return null;
  }

  let imageUrls = pickImages(product?.image);
  if (imageUrls.length === 0 && meta.ogImage) imageUrls = [meta.ogImage];
  if (imageUrls.length === 0) {
    warnings.push(`Produk "${name}" dilewati (tidak ada gambar)`);
    return null;
  }

  let description = (product?.description ?? meta.ogDesc ?? '').trim();
  if (description.length < 10) description = `${name}. Deskripsi belum tersedia — lengkapi saat impor.`;

  const ratingAvg = product?.aggregateRating?.ratingValue
    ? Number(product.aggregateRating.ratingValue)
    : undefined;

  return {
    // selaras productCreateSchema
    name: name.slice(0, 120),
    description: description.slice(0, 5000),
    price,
    stock: 0, // Tokopedia tak selalu ekspos stok — seller isi manual saat impor
    minOrderQty: 1,
    weight: 1000, // default 1kg — sesuaikan saat impor
    condition: 'NEW',
    imageUrls,
    // metadata
    sourceUrl,
    categoryHint,
    ratingAvg: Number.isFinite(ratingAvg) ? ratingAvg : undefined,
  };
}

// Deteksi halaman blokir / captcha anti-bot.
async function assertNotBlocked(page: Page): Promise<void> {
  const title = (await page.title()).toLowerCase();
  const blockedHints = ['akses ditolak', 'access denied', 'captcha', 'attention required'];
  if (blockedHints.some((h) => title.includes(h))) {
    throw new BadRequestError(
      'Tokopedia memblokir permintaan (proteksi anti-bot). Coba lagi beberapa saat, atau kurangi jumlah produk.',
    );
  }
}

// Kumpulkan URL produk dari halaman toko (dengan scroll untuk lazy-load).
async function collectProductUrls(page: Page, shopSlug: string, max: number): Promise<string[]> {
  const found = new Set<string>();
  let stableRounds = 0;

  for (let i = 0; i < 12 && found.size < max && stableRounds < 3; i++) {
    const hrefs = await page.$$eval('a[href]', (nodes) =>
      nodes.map((n) => (n as HTMLAnchorElement).href),
    );
    const before = found.size;
    for (const href of hrefs) {
      try {
        const u = new URL(href);
        if (!/(^|\.)tokopedia\.com$/i.test(u.hostname)) continue;
        const segs = u.pathname.split('/').filter(Boolean);
        // Produk toko ini: /{shopSlug}/{product-slug}
        if (segs.length >= 2 && segs[0] === shopSlug && !NON_PRODUCT_SEGMENTS.has(segs[1].toLowerCase())) {
          found.add(`${u.origin}${u.pathname}`);
        }
      } catch {
        /* href tak valid */
      }
    }
    stableRounds = found.size === before ? stableRounds + 1 : 0;
    await page.mouse.wheel(0, 2400);
    await page.waitForTimeout(1200);
  }

  return [...found].slice(0, max);
}

export async function scrapeTokopedia(url: string, maxProducts: number): Promise<ScrapeResult> {
  const { slug, isProductUrl } = shopSlugFromUrl(url);
  const warnings: string[] = [];
  let browser: Browser | null = null;

  try {
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });
    } catch (err) {
      logger.error({ err }, 'Gagal meluncurkan Chromium untuk scraper');
      throw new BadRequestError(
        'Browser scraper belum siap di server. Jalankan `npx playwright install chromium` (lokal) atau rebuild image Docker.',
      );
    }
    const context = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1366, height: 900 },
      locale: 'id-ID',
    });
    const page = await context.newPage();

    // --- URL produk tunggal: scrape 1 produk saja ---
    if (isProductUrl) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
      await assertNotBlocked(page);
      await page.waitForTimeout(1500);
      const single = await extractProduct(page, url, warnings);
      const shop: ScrapedShop = { slug, url: new URL(url).origin + '/' + slug };
      return {
        shop,
        products: single ? [single] : [],
        meta: {
          requestedUrl: url,
          scrapedAt: new Date().toISOString(),
          productCount: single ? 1 : 0,
          warnings,
        },
      };
    }

    // --- URL toko: daftar produk lalu detail satu per satu ---
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await assertNotBlocked(page);
    await page.waitForTimeout(1500);

    const shopName = await page
      .evaluate(() => document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? undefined)
      .catch(() => undefined);

    const productUrls = await collectProductUrls(page, slug, maxProducts);
    if (productUrls.length === 0) {
      throw new BadRequestError(
        'Tidak ada produk yang terdeteksi di halaman toko ini. Mungkin toko kosong, URL salah, atau Tokopedia mengubah struktur halaman.',
      );
    }

    const products: ScrapedProduct[] = [];
    for (const purl of productUrls) {
      try {
        await page.goto(purl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
        await assertNotBlocked(page);
        await page.waitForTimeout(900);
        const p = await extractProduct(page, purl, warnings);
        if (p) products.push(p);
      } catch (err) {
        logger.warn({ err, purl }, 'Gagal scrape produk');
        warnings.push(`Gagal memuat produk: ${purl}`);
      }
    }

    const shop: ScrapedShop = { name: shopName, slug, url: new URL(url).origin + '/' + slug };
    return {
      shop,
      products,
      meta: {
        requestedUrl: url,
        scrapedAt: new Date().toISOString(),
        productCount: products.length,
        warnings,
      },
    };
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}
