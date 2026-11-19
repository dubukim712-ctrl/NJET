'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import { getAuthContext } from '@/data/auth/guards';
import { createClient } from '@/data/supabase/server';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  adminProductReviewRowsSchema,
  adminProductReviewPageSchema,
  moderateProductReviewSchema,
  productRatingSummaryRowsSchema,
  productReviewIdSchema,
  productReviewPageSchema,
  publishedProductReviewsSchema,
} from '@/lib/validations/product-review';
import type {
  AdminProductReview,
} from '@/lib/validations/product-review';

type PublishedProductReview = {
  review_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string | null;
};

export async function getProductRatingSummaryAction(
  productId: unknown
): Promise<ActionResult<{ averageRating: number; reviewCount: number }>> {
  const parsed = productReviewIdSchema.safeParse(productId);
  if (!parsed.success) return { success: false, error: 'Invalid product.' };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      'published_product_rating_summary',
      { p_product_id: parsed.data }
    );
    if (error) throw error;
    const summary = productRatingSummaryRowsSchema.safeParse(data);
    if (!summary.success || summary.data.length !== 1 || !summary.data[0]) {
      throw new Error('Product rating response failed validation.');
    }
    const row = summary.data[0];
    return {
      success: true,
      data: {
        averageRating: row.average_rating,
        reviewCount: row.review_count,
      },
    };
  } catch (error) {
    console.error('Could not load product rating summary.', error);
    return { success: false, error: 'Product ratings could not be loaded.' };
  }
}

export async function getPublishedProductReviewsAction(
  payload: unknown
): Promise<ActionResult<PublishedProductReview[]>> {
  const parsed = productReviewPageSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Choose a valid review page.' };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('published_product_reviews', {
      p_product_id: parsed.data.productId,
      p_limit: parsed.data.limit,
      p_offset: parsed.data.offset,
    });
    if (error) throw error;
    const reviews = publishedProductReviewsSchema.safeParse(data);
    if (!reviews.success) throw new Error('Product reviews response failed validation.');
    return { success: true, data: reviews.data };
  } catch (error) {
    console.error('Could not load published product reviews.', error);
    return { success: false, error: 'Product reviews could not be loaded.' };
  }
}

export async function getAdminProductReviewsAction(
  payload: unknown
): Promise<
  ActionResult<AdminProductReview[]>
> {
  const parsed = adminProductReviewPageSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Choose a valid moderation page.' };
  const context = await getAuthContext();
  if (!context || !hasPermission(context.profile, PERMISSIONS.productReviewsModerate)) {
    return { success: false, error: 'You do not have permission to moderate reviews.' };
  }
  try {
    const { data, error } = await context.supabase.rpc('admin_product_reviews', {
      p_limit: parsed.data.limit,
      p_offset: parsed.data.offset,
    });
    if (error) throw error;
    const reviews = adminProductReviewRowsSchema.safeParse(data);
    if (!reviews.success) throw new Error('Admin product reviews response failed validation.');
    return { success: true, data: reviews.data };
  } catch (error) {
    console.error('Could not load product reviews for moderation.', error);
    return { success: false, error: 'Reviews awaiting moderation could not be loaded.' };
  }
}

export async function moderateProductReviewAction(
  payload: unknown
): Promise<ActionResult> {
  const parsed = moderateProductReviewSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Choose a valid review decision.' };
  const context = await getAuthContext();
  if (!context || !hasPermission(context.profile, PERMISSIONS.productReviewsModerate)) {
    return { success: false, error: 'You do not have permission to moderate reviews.' };
  }

  try {
    const { error } = await context.supabase.rpc('moderate_product_review', {
      p_review_id: parsed.data.reviewId,
      p_status: parsed.data.status,
    });
    if (error) throw error;
    revalidatePath('/admin/products');
    revalidatePath('/shop');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Could not moderate product review.', error);
    return { success: false, error: 'The review decision could not be saved.' };
  }
}
