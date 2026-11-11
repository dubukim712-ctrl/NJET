import { z } from 'zod';

const uuid = z.string().uuid();

export const StorefrontCatalogRowsSchema = z.array(z.object({
  product_id: uuid,
  product_slug: z.string(),
  product_name: z.string(),
  product_description: z.string(),
  product_type: z.enum(['ebike', 'part', 'accessory']),
  category_id: uuid,
  category_name: z.string().nullable(),
  subcategory_id: uuid.nullable(),
  subcategory_name: z.string().nullable(),
  product_image_path: z.string().nullable(),
  is_demo: z.boolean(),
  variant_id: uuid.nullable(),
  variant_name: z.string().nullable(),
  sku: z.string().nullable(),
  price_minor: z.number().int().nullable(),
  reservation_minor: z.number().int().nullable(),
  home_credit_downpayment_minor: z.number().int().nullable(),
  variant_image_path: z.string().nullable(),
  specifications: z.record(z.string(), z.string()).nullable(),
}));

export const StorefrontBranchOptionsSchema = z.array(z.object({
  id: uuid,
  name: z.string(),
}));

export const StorefrontAvailabilityRowsSchema = z.array(z.object({
  variant_id: uuid,
  branch_id: uuid,
  available: z.boolean(),
  stock: z.number().int().nonnegative().nullable(),
}));
