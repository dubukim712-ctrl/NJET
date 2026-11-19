'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import { getAuthContext } from '@/data/auth/guards';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  customerOrderItemReviewRowsSchema,
  customerOrderItemReviewsRowsSchema,
  customerOrderItemReviewSchema,
  customerOrderItemReviewsSchema,
  customerProductReviewItemsRowsSchema,
  productReviewIdSchema,
  submitProductReviewSchema,
} from '@/lib/validations/product-review';
import type { ProductReviewStatus } from '@/types/product-review-tables';

export async function getCustomerOrderItemReviewAction(
  payload: unknown
): Promise<ActionResult<{
  authenticated: boolean;
  eligible: boolean;
  review: {
    id: string;
    rating: number;
    comment: string | null;
    isAnonymous: boolean;
    status: ProductReviewStatus;
  } | null;
}>> {
  const parsed = customerOrderItemReviewSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Choose a valid order item.' };
  const context = await getAuthContext();
  if (!context || !hasPermission(context.profile, PERMISSIONS.storefrontAccess)) {
    return {
      success: true,
      data: { authenticated: false, eligible: false, review: null },
    };
  }

  try {
    const { data, error } = await context.supabase.rpc('customer_order_item_review_details', {
      p_order_id: parsed.data.orderId,
      p_order_item_id: parsed.data.orderItemId,
    });
    if (error) throw error;
    const result = customerOrderItemReviewRowsSchema.safeParse(data);
    if (!result.success) throw new Error('Order item review response failed validation.');
    const row = result.data[0];
    return {
      success: true,
      data: {
        authenticated: true,
        eligible: row.eligible,
        review: row.review_id && row.rating !== null && row.status
          ? {
              id: row.review_id,
              rating: row.rating,
              comment: row.comment,
              isAnonymous: row.is_anonymous ?? false,
              status: row.status,
            }
          : null,
      },
    };
  } catch (error) {
    console.error('Could not load order item review.', error);
    return { success: false, error: 'Your review eligibility could not be checked.' };
  }
}

export async function getCustomerOrderItemReviewsAction(
  payload: unknown
): Promise<ActionResult<{
  authenticated: boolean;
  reviews: { orderItemId: string; status: ProductReviewStatus | null }[];
}>> {
  const parsed = customerOrderItemReviewsSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Choose a valid order and items.' };
  const context = await getAuthContext();
  if (!context || !hasPermission(context.profile, PERMISSIONS.storefrontAccess)) {
    return { success: true, data: { authenticated: false, reviews: [] } };
  }

  try {
    const { data, error } = await context.supabase.rpc('customer_order_item_reviews', {
      p_order_id: parsed.data.orderId,
      p_order_item_ids: parsed.data.orderItemIds,
    });
    if (error) throw error;
    const result = customerOrderItemReviewsRowsSchema.safeParse(data);
    if (!result.success || result.data.length !== parsed.data.orderItemIds.length) {
      throw new Error('Order item reviews response failed validation.');
    }

    const rowsByItem = new Map(result.data.map((row) => [row.order_item_id, row]));
    if (
      rowsByItem.size !== parsed.data.orderItemIds.length ||
      parsed.data.orderItemIds.some((orderItemId) => !rowsByItem.has(orderItemId))
    ) {
      throw new Error('Order item reviews response was incomplete.');
    }

    return {
      success: true,
      data: {
        authenticated: true,
        reviews: result.data.map((row) => ({
          orderItemId: row.order_item_id,
          status: row.review_id ? row.status : null,
        })),
      },
    };
  } catch (error) {
    console.error('Could not load order item reviews.', error);
    return { success: false, error: 'Your review status could not be checked.' };
  }
}

export async function getCustomerProductReviewItemsAction(
  productId: unknown
): Promise<ActionResult<{
  authenticated: boolean;
  items: {
    orderItemId: string;
    orderId: string;
    orderNumber: string;
    variantName: string;
    review: {
      id: string;
      rating: number;
      comment: string | null;
      isAnonymous: boolean;
      status: ProductReviewStatus;
    } | null;
  }[];
}>> {
  const parsed = productReviewIdSchema.safeParse(productId);
  if (!parsed.success) return { success: false, error: 'Invalid product.' };
  const context = await getAuthContext();
  if (!context || !hasPermission(context.profile, PERMISSIONS.storefrontAccess)) {
    return { success: true, data: { authenticated: false, items: [] } };
  }

  try {
    const { data, error } = await context.supabase.rpc('customer_product_review_items', {
      p_product_id: parsed.data,
    });
    if (error) throw error;
    const result = customerProductReviewItemsRowsSchema.safeParse(data);
    if (!result.success) throw new Error('Product review items response failed validation.');

    return {
      success: true,
      data: {
        authenticated: true,
        items: result.data.map((row) => {
          const item = {
            orderItemId: row.order_item_id,
            orderId: row.order_id,
            orderNumber: row.order_number,
            variantName: row.variant_name,
          };
          if (!row.review_id) return { ...item, review: null };
          if (row.rating === null || !row.status || row.is_anonymous === null) {
            throw new Error('Product review item response was incomplete.');
          }
          return {
            ...item,
            review: {
              id: row.review_id,
              rating: row.rating,
              comment: row.comment,
              isAnonymous: row.is_anonymous,
              status: row.status,
            },
          };
        }),
      },
    };
  } catch (error) {
    console.error('Could not load completed product order items for review.', error);
    return { success: false, error: 'Your completed order items could not be loaded.' };
  }
}

export async function submitProductReviewAction(
  payload: unknown
): Promise<ActionResult<{ status: ProductReviewStatus }>> {
  const parsed = submitProductReviewSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Check the rating and review text.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const context = await getAuthContext();
  if (!context || !hasPermission(context.profile, PERMISSIONS.storefrontAccess)) {
    return { success: false, error: 'Sign in with a customer account to submit a review.' };
  }

  try {
    const { data, error } = await context.supabase.rpc('submit_product_review', {
      p_order_id: parsed.data.orderId,
      p_order_item_id: parsed.data.orderItemId,
      p_product_id: parsed.data.productId,
      p_rating: parsed.data.rating,
      p_comment: parsed.data.comment || null,
      p_is_anonymous: parsed.data.isAnonymous,
    });
    if (error) throw error;
    if (data !== 'pending') throw new Error('Unexpected product review status.');
    revalidatePath('/shop');
    return { success: true, data: { status: 'pending' } };
  } catch (error) {
    console.error('Could not submit product review.', error);
    const message = error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : '';
    return {
      success: false,
      error: message.includes('completed order item')
        ? 'A completed order item for this product is required to submit a review.'
        : 'Your review could not be submitted. Try again.',
    };
  }
}
