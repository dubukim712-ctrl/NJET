'use server';

import { revalidatePath } from 'next/cache';
import { revalidateStorefrontCatalog } from '@/data/commerce/revalidate-storefront';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { commerceActionFailure as failure } from '@/data/commerce/action-failure';
import { PERMISSIONS } from '@/lib/permissions';
import { variantAdminSchema } from '@/lib/validations/commerce-admin';

export async function saveCommerceVariantAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/products');
  const parsed = variantAdminSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Check the variant details.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    id, productId, sku, name, specifications, priceMinor, reservationMinor,
    homeCreditDownpaymentMinor, imagePath, active,
  } = parsed.data;
  try {
    const result = id
      ? await supabase.from('product_variants').update({
          product_id: productId, sku, name, specifications, price_minor: priceMinor,
          reservation_minor: reservationMinor,
          home_credit_downpayment_minor: homeCreditDownpaymentMinor,
          image_path: imagePath, active,
        }).eq('id', id)
      : await supabase.from('product_variants').insert({
          product_id: productId, sku, name, specifications, price_minor: priceMinor,
          reservation_minor: reservationMinor,
          home_credit_downpayment_minor: homeCreditDownpaymentMinor,
          image_path: imagePath,
        });
    if (result.error) return failure(result.error, 'Could not save this product variant.');

    revalidatePath('/admin/products');
    revalidateStorefrontCatalog();
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not save this product variant.');
  }
}
