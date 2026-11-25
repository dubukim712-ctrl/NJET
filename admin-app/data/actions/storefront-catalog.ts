'use server';

import { z } from 'zod';
import type { ActionResult } from '@/data/actions/auth';
import { shopCatalogFiltersSchema } from '@/lib/validations/storefront-catalog-page';
import { getShopCatalogPage, getStoreCatalog } from '@/data/commerce/catalog';
import type { CatalogData, ShopCatalogPage } from '@/data/commerce/catalog';

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

export async function getShopCatalogPageAction(input: unknown): Promise<ActionResult<ShopCatalogPage>> {
  const parsed = shopCatalogFiltersSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Choose valid catalog filters and try again.' };
  const data = await getShopCatalogPage(parsed.data);
  if (!data) return { success: false, error: 'The catalog could not be loaded. Please try again later.' };
  return { success: true, data };
}
