import { z } from 'zod';

export const inventoryValuationRequestSchema = z.object({
  branchId: z.string().uuid().nullable(),
  page: z.number().int().min(1).max(10000),
  pageSize: z.union([z.literal(25), z.literal(50), z.literal(100)]),
}).strict();

export const inventoryValuationResponseSchema = z.object({
  branches: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).strict()),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  result: z.object({
    total: z.number().int().nonnegative(),
    summary: z.object({
      known_value_minor: z.string().regex(/^\d+$/),
      unknown_cost_quantity: z.number().int().nonnegative(),
    }).strict(),
    rows: z.array(z.object({
      branch_id: z.string().uuid(),
      branch_name: z.string(),
      product_name: z.string(),
      product_type: z.enum(['ebike', 'part', 'accessory']),
      variant_id: z.string().uuid(),
      variant_name: z.string(),
      sku: z.string(),
      quantity_on_hand: z.number().int().nonnegative(),
      known_cost_quantity: z.number().int().nonnegative(),
      unknown_cost_quantity: z.number().int().nonnegative(),
      known_value_minor: z.string().regex(/^\d+$/),
    }).strict()),
  }).strict(),
}).strict();

export type InventoryValuationResponse = z.infer<typeof inventoryValuationResponseSchema>;
