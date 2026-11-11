'use server';

import { z } from 'zod';
import type { ActionResult } from '@/data/actions/auth';
import { getStoreCatalog } from '@/data/commerce/catalog';
import type { CatalogData } from '@/data/commerce/catalog';

const catalogRequestSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
});

export async function getStoreCatalogAction(
  slug?: unknown
): Promise<ActionResult<CatalogData>> {
  const parsed = catalogRequestSchema.safeParse({ slug });
  if (!parsed.success) {
    return { success: false, error: 'Invalid product address.' };
  }

  const result = await getStoreCatalog(parsed.data.slug);
  if (!result.data) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}
