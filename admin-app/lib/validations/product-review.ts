import { z } from 'zod';

export const productReviewIdSchema = z.string().uuid();

export const reviewableOrderItemIdsSchema = z.array(productReviewIdSchema)
  .min(1)
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length);

export const customerOrderItemReviewSchema = z.object({
  orderId: productReviewIdSchema,
  orderItemId: productReviewIdSchema,
}).strict();

export const customerOrderItemReviewsSchema = z.object({
  orderId: productReviewIdSchema,
  orderItemIds: reviewableOrderItemIdsSchema,
}).strict();

export const productReviewPageSchema = z.object({
  productId: productReviewIdSchema,
  limit: z.number().int().min(1).max(50),
  offset: z.number().int().min(0).max(10000),
}).strict();

export const adminProductReviewPageSchema = z.object({
  limit: z.number().int().min(1).max(50),
  offset: z.number().int().min(0).max(10000),
}).strict();

export const submitProductReviewSchema = z.object({
  orderId: productReviewIdSchema,
  orderItemId: productReviewIdSchema,
  productId: productReviewIdSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
  isAnonymous: z.boolean(),
}).strict();

export const moderateProductReviewSchema = z.object({
  reviewId: productReviewIdSchema,
  status: z.enum(['published', 'rejected']),
}).strict();

export const productRatingSummaryRowsSchema = z.array(z.object({
  average_rating: z.number().min(0).max(5),
  review_count: z.number().int().nonnegative(),
}));

export const productRatingSummariesRowsSchema = z.array(z.object({
  product_id: productReviewIdSchema,
  average_rating: z.number().min(0).max(5),
  review_count: z.number().int().nonnegative(),
}));

export const publishedProductReviewsSchema = z.array(z.object({
  review_id: productReviewIdSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  reviewer_name: z.string().nullable(),
}));

export const customerOrderItemReviewRowsSchema = z.array(z.object({
  eligible: z.boolean(),
  product_id: productReviewIdSchema.nullable(),
  review_id: productReviewIdSchema.nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  comment: z.string().nullable(),
  status: z.enum(['pending', 'published', 'rejected']).nullable(),
  is_anonymous: z.boolean().nullable(),
})).length(1);

export const customerOrderItemReviewsRowsSchema = z.array(z.object({
  order_item_id: productReviewIdSchema,
  product_id: productReviewIdSchema.nullable(),
  eligible: z.boolean(),
  review_id: productReviewIdSchema.nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  comment: z.string().nullable(),
  status: z.enum(['pending', 'published', 'rejected']).nullable(),
  is_anonymous: z.boolean().nullable(),
})).max(100);

export const customerProductReviewItemsRowsSchema = z.array(z.object({
  order_item_id: productReviewIdSchema,
  order_id: productReviewIdSchema,
  order_number: z.string().min(1),
  variant_name: z.string(),
  review_id: productReviewIdSchema.nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  comment: z.string().nullable(),
  status: z.enum(['pending', 'published', 'rejected']).nullable(),
  is_anonymous: z.boolean().nullable(),
})).max(100);

export const adminProductReviewRowsSchema = z.array(z.object({
  review_id: productReviewIdSchema,
  product_id: productReviewIdSchema,
  product_name: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
}));

export type SubmitProductReviewInput = z.infer<typeof submitProductReviewSchema>;
export type CustomerOrderItemReview = z.infer<
  typeof customerOrderItemReviewRowsSchema
>[number];
export type AdminProductReview = z.infer<
  typeof adminProductReviewRowsSchema
>[number];
