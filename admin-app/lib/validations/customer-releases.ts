import { z } from 'zod';

const optionalId = z.uuid().nullable();
const optionalText = (max: number) => z.string().trim().max(max).transform((text) => text || null);

export const releaseFieldsSchema = z.object({
  order_id: optionalId,
  customer_name: optionalText(80),
  product_id: optionalId,
  model_name: optionalText(120),
  branch_id: optionalId,
  branch_name: optionalText(120),
  caption: optionalText(500),
  is_approved: z.boolean(),
  display_order: z.number().int().min(-1000).max(1000),
});

export const releaseImagePathSchema = z.string().regex(/^releases\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/);
export const releaseIdSchema = z.uuid();
