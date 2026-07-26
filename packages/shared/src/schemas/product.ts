import { z } from 'zod';

export const productSortSchema = z.enum([
  'relevance',  // default — paling sesuai
  'bestseller', // terlaris
  'cheapest',   // termurah
  'expensive',  // termahal
  'newest',     // terbaru
  'rating',     // rating tertinggi
]);
export type ProductSort = z.infer<typeof productSortSchema>;

// Query string selalu berupa string — `z.coerce.boolean()` tidak dipakai karena
// Boolean('false') bernilai true.
const boolParam = z
  .string()
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1'));

export const productListQuerySchema = z.object({
  q: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().optional(),
  shopId: z.string().uuid().optional(),
  province: z.string().optional(),
  // Multi-kota, comma-separated di query string — semantik OR antar kota (M10-A10).
  cities: z
    .string()
    .optional()
    .transform((v) =>
      v ? v.split(',').map((c) => c.trim()).filter(Boolean) : undefined,
    ),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  condition: z.enum(['NEW', 'USED']).optional(),
  // Filter boolean — hanya menyaring saat bernilai true, tidak dipakai untuk
  // menyaring kebalikannya (checkbox "aktif / tidak dipakai", bukan tri-state).
  officialStoreOnly: boolParam,
  freeShipping: boolParam,
  cod: boolParam,
  sort: productSortSchema.default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
