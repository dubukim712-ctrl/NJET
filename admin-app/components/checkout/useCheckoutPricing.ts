'use client';

import { getCheckoutCartPricing } from '@/data/commerce/checkout-pricing';
import { useCartVariantsQuery } from '@/data/commerce/catalog-client';
import { useDiscountQuote } from '@/components/commerce/useDiscountQuote';
import type { CheckoutOptions } from '@/data/commerce/checkout-options';
import type { Fulfillment } from '@/types/commerce-tables';

type CheckoutItems = Parameters<typeof getCheckoutCartPricing>[0]['items'];

export function useCheckoutPricing({
  items,
  fulfillment,
  branchId,
  zoneId,
  branches,
  zones,
}: {
  items: CheckoutItems;
  fulfillment: Fulfillment;
  branchId: string;
  zoneId: string;
  branches: CheckoutOptions['branches'];
  zones: CheckoutOptions['zones'];
}) {
  const { data: variants = [], error: queryError, isFetching } =
    useCartVariantsQuery(items.map((item) => item.variantId), true);
  const catalogError = queryError instanceof Error
    ? queryError.message
    : queryError ? 'Cart item details could not be loaded.' : null;
  const loadingCart = items.length > 0 && isFetching;
  const cartSignature = JSON.stringify(items.map(
    ({ variantId, quantity }) => [variantId, quantity]
  ));
  const { activePreview, onApplied, onCleared } = useDiscountQuote(cartSignature);
  const deliveryFee = fulfillment === 'delivery'
    ? zones.find((zone) => zone.id === zoneId)?.fee_minor ?? 0
    : 0;
  const pricing = getCheckoutCartPricing({
    items,
    variants,
    quoteRows: activePreview?.rows ?? [],
    fulfillment,
    branchId,
    branches,
    deliveryFee,
  });

  return {
    ...pricing,
    activePreview,
    onApplied,
    onCleared,
    cartSignature,
    catalogError,
    loadingCart,
    deliveryFee,
  };
}
