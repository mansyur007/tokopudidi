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

export const productListQuerySchema = z.object({
  q: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().optional(),
  shopId: z.string().uuid().optional(),
  province: z.string().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  condition: z.enum(['NEW', 'USED']).optional(),
  sort: productSortSchema.default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
