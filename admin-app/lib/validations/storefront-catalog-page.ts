import { z } from 'zod';

export const shopPageSize = 24;
const categoryFilter = z.union([z.uuid(), z.literal('uncategorized')]).nullable();
export const shopCatalogFiltersSchema = z.object({
  search: z.string().trim().max(120),
  category: categoryFilter,
  subcategory: categoryFilter,
  branch: z.uuid().nullable().optional(),
  inStock: z.boolean(),
  sort: z.enum(['featured', 'price-asc', 'price-desc']),
  page: z.number().int().min(1).max(2147483647),
});
export type ShopCatalogFilters = z.infer<typeof shopCatalogFiltersSchema>;

const price = z.number().int().nonnegative();
const image = z.string().nullable();
export const shopCatalogPageSchema = z.object({
  total: z.number().int().nonnegative(),
  facets: z.array(z.object({
    category_id: z.uuid(),
    category_name: z.string(),
    subcategory_id: z.string(),
    subcategory_name: z.string(),
  })),
  products: z.array(z.object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    product_type: z.enum(['ebike', 'part', 'accessory']),
    category_id: z.uuid(),
    categoryName: z.string().nullable(),
    subcategory_id: z.uuid().nullable(),
    subcategoryName: z.string().nullable(),
    image_path: image,
    is_demo: z.boolean(),
    stockSummary: z.object({ available: z.boolean(), stock: price.nullable() }),
    ratingSummary: z.object({ averageRating: z.number(), reviewCount: price }),
    variants: z.array(z.object({
      id: z.uuid(),
      product_id: z.uuid(),
      name: z.string(),
      sku: z.string(),
      price_minor: price,
      list_price_minor: price,
      discount_unit_minor: price,
      discount_name: z.string().nullable(),
      reservation_minor: price,
      home_credit_downpayment_minor: price,
      image_path: image,
      specifications: z.record(z.string(), z.string()).nullable(),
      stockByBranch: z.array(z.object({ branchId: z.uuid(), available: z.boolean(), stock: price.nullable() })),
    })),
  })),
});
