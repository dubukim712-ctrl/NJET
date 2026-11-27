import { z } from 'zod';

const discountTargetSchema = z.object({
  productVariantId: z.string().uuid().nullable(),
  productCategoryId: z.string().uuid().nullable(),
}).refine(
  (target) => Boolean(target.productVariantId) !== Boolean(target.productCategoryId),
  { message: 'Choose a variant or category for each target.' },
);

const couponCodeSchema = z.preprocess(
  (value) => typeof value === 'string' && value.trim()
    ? value.replace(/\s/g, '').toUpperCase()
    : null,
  z.string().regex(/^[A-Z0-9][A-Z0-9_-]{2,31}$/).nullable(),
);

export const saveProductDiscountSchema = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(120),
  discountType: z.enum(['percentage', 'fixed']),
  value: z.number().int().positive().max(2147483647),
  couponCode: couponCodeSchema,
  startsAt: z.string().datetime({ offset: true }).nullable(),
  endsAt: z.string().datetime({ offset: true }).nullable(),
  maxRedemptions: z.number().int().positive().max(2147483647).nullable(),
  active: z.boolean(),
  targets: z.array(discountTargetSchema).min(1).max(100),
}).superRefine((discount, context) => {
  if (discount.discountType === 'percentage' && (discount.value < 100 || discount.value > 10000)) {
    context.addIssue({
      code: 'custom',
      path: ['value'],
      message: 'Percentage must be between 1% and 100%.',
    });
  }
  if (!discount.couponCode && discount.maxRedemptions !== null) {
    context.addIssue({
      code: 'custom',
      path: ['maxRedemptions'],
      message: 'Redemption limits require a coupon code.',
    });
  }
  if (discount.startsAt && discount.endsAt &&
    Date.parse(discount.endsAt) < Date.parse(discount.startsAt)) {
    context.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'End date must be on or after the start date.',
    });
  }
  if (discount.targets.some((target) => target.productVariantId) &&
    discount.targets.some((target) => target.productCategoryId)) {
    context.addIssue({
      code: 'custom',
      path: ['targets'],
      message: 'Choose either specific variants or whole categories.',
    });
  }
  const keys = discount.targets.map((target) =>
    target.productVariantId ?? target.productCategoryId
  );
  if (new Set(keys).size !== keys.length) {
    context.addIssue({
      code: 'custom',
      path: ['targets'],
      message: 'Remove duplicate targets.',
    });
  }
});

export const discountPreviewSchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('storefront'),
    couponCode: z.string().trim().min(3).max(32),
    items: z.array(z.object({
      variantId: z.string().uuid(),
      quantity: z.number().int().min(1).max(99),
    })).min(1).max(30),
  }),
  z.object({
    channel: z.literal('walk_in'),
    couponCode: z.string().trim().min(3).max(32),
    phone: z.string().trim().regex(/^[+0-9][0-9 ()-]{6,19}$/),
    items: z.array(z.object({
      variantId: z.string().uuid(),
      quantity: z.number().int().min(1).max(99),
    })).min(1).max(30),
  }),
]).superRefine((input, context) => {
  if (new Set(input.items.map((item) => item.variantId)).size !== input.items.length) {
    context.addIssue({
      code: 'custom',
      path: ['items'],
      message: 'Remove duplicate cart items.',
    });
  }
});

export const productDiscountRowsSchema = z.array(z.object({
  id: z.string().uuid(),
  name: z.string(),
  discount_type: z.enum(['percentage', 'fixed']),
  value: z.number().int(),
  coupon_code: z.string().nullable(),
  active: z.boolean(),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  max_redemptions: z.number().int().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  redemptions: z.number().int().nonnegative(),
  targets: z.array(z.object({
    product_variant_id: z.string().uuid().nullable(),
    product_category_id: z.string().uuid().nullable(),
  })),
}));

export const discountQuoteRowsSchema = z.array(z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  list_price_minor: z.number().int().nonnegative(),
  unit_price_minor: z.number().int().nonnegative(),
  discount_unit_minor: z.number().int().nonnegative(),
  discount_id: z.string().uuid().nullable(),
  discount_name: z.string().nullable(),
  discount_code: z.string().nullable(),
}));

export const activeVariantDiscountRowsSchema = z.array(z.object({
  variant_id: z.string().uuid(),
  list_price_minor: z.number().int().nonnegative(),
  unit_price_minor: z.number().int().nonnegative(),
  discount_unit_minor: z.number().int().nonnegative(),
  discount_id: z.string().uuid().nullable(),
  discount_name: z.string().nullable(),
}));

export type SaveProductDiscountInput = z.infer<typeof saveProductDiscountSchema>;
export type DiscountPreviewInput = z.infer<typeof discountPreviewSchema>;
export type ProductDiscountAdminRow = z.infer<typeof productDiscountRowsSchema>[number];
export type DiscountQuoteRow = z.infer<typeof discountQuoteRowsSchema>[number];
export type ActiveVariantDiscountRow = z.infer<typeof activeVariantDiscountRowsSchema>[number];
