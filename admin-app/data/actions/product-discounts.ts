'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import type { createClient } from '@/data/supabase/server';
import { getAuthContext, requirePermission } from '@/data/auth/guards';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import {
  discountPreviewSchema,
  discountQuoteRowsSchema,
  saveProductDiscountSchema,
} from '@/lib/validations/product-discount';
import type { DiscountQuoteRow } from '@/lib/validations/product-discount';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function saveProductDiscountAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/products');
  const parsed = saveProductDiscountSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Review the discount details and targets.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const discount = parsed.data;
  try {
    const { error } = await supabase.rpc('save_product_discount', {
      p_discount_id: discount.id,
      p_name: discount.name,
      p_discount_type: discount.discountType,
      p_value: discount.value,
      p_coupon_code: discount.couponCode,
      p_starts_at: discount.startsAt,
      p_ends_at: discount.endsAt,
      p_max_redemptions: discount.maxRedemptions,
      p_active: discount.active,
      p_targets: discount.targets.map((target) => ({
        product_variant_id: target.productVariantId,
        product_category_id: target.productCategoryId,
      })),
    });
    if (error) {
      console.error('Could not save product discount.', error);
      return {
        success: false,
        error: error.code === '23505'
          ? 'That coupon code is already in use.'
          : error.message,
      };
    }

    revalidatePath('/admin/products');
    revalidatePath('/shop');
    revalidatePath('/shop/view-product/[slug]', 'page');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Could not save product discount.', error);
    return { success: false, error: 'Could not save this discount. Please try again.' };
  }
}

export async function previewProductDiscountAction(
  payload: unknown,
): Promise<ActionResult<DiscountQuoteRow[]>> {
  const parsed = discountPreviewSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Enter a valid coupon code and cart.' };
  }
  const input = parsed.data;
  const context = input.channel === 'storefront' ? await getAuthContext() : null;
  let supabase: SupabaseClient;
  if (input.channel === 'storefront') {
    if (!context || !hasPermission(context.profile, PERMISSIONS.storefrontAccess)) {
      return { success: false, error: 'Sign in before checking a coupon code.' };
    }
    supabase = context.supabase;
  } else {
    const permission = await requirePermission(PERMISSIONS.ordersManage, '/admin/orders/new');
    supabase = permission.supabase;
  }

  try {
    const { data, error } = await supabase.rpc('preview_product_discount_cart', {
      p_items: input.items.map(({ variantId, quantity }) => ({
        variant_id: variantId,
        quantity,
      })),
      p_coupon_code: input.couponCode,
      p_channel: input.channel,
      p_phone: input.channel === 'walk_in' ? input.phone : null,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    const rows = discountQuoteRowsSchema.safeParse(data);
    if (!rows.success || rows.data.length !== input.items.length) {
      console.error('Coupon preview response failed validation.');
      return { success: false, error: 'The coupon could not be checked. Try again.' };
    }
    return { success: true, data: rows.data };
  } catch (error) {
    console.error('Could not preview product discount.', error);
    return { success: false, error: 'The coupon could not be checked. Try again.' };
  }
}
