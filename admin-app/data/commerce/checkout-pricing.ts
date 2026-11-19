import type { CartVariant } from '@/data/commerce/catalog-client';
import type { DiscountQuoteRow } from '@/lib/validations/product-discount';
import type { Fulfillment } from '@/types/commerce-tables';

type CartLine = { variantId: string; quantity: number };

export function getCheckoutCartPricing({
  items,
  variants,
  quoteRows,
  fulfillment,
  branchId,
  branches,
  deliveryFee,
}: {
  items: CartLine[];
  variants: CartVariant[];
  quoteRows: DiscountQuoteRow[];
  fulfillment: Fulfillment;
  branchId: string;
  branches: { id: string }[];
  deliveryFee: number;
}) {
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const quoteByVariant = new Map(quoteRows.map((row) => [row.variant_id, row]));
  const cartItems = items.map((item) => {
    const variant = variantById.get(item.variantId) ?? null;
    const quote = quoteByVariant.get(item.variantId);
    return {
      ...item,
      variant: variant && quote ? {
        ...variant,
        price_minor: quote.unit_price_minor,
        list_price_minor: quote.list_price_minor,
        discount_unit_minor: quote.discount_unit_minor,
        discount_name: quote.discount_name,
      } : variant,
    };
  });
  const allVariantsLoaded = cartItems.length > 0 && cartItems.every((item) => item.variant);
  const hasEbike = cartItems.some((item) => item.variant?.productType === 'ebike');
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.variant?.price_minor ?? 0) * item.quantity,
    0
  );
  const discountTotal = cartItems.reduce(
    (sum, item) => sum + (item.variant?.discount_unit_minor ?? 0) * item.quantity,
    0
  );
  const pickupReservationAmount = fulfillment === 'pickup'
    ? cartItems.reduce((sum, item) =>
        sum + (item.variant?.productType === 'ebike'
          ? item.variant.reservation_minor * item.quantity
          : 0), 0)
    : 0;
  const homeCreditDownpayment = cartItems.reduce(
    (sum, item) =>
      sum + (item.variant?.home_credit_downpayment_minor ?? 0) * item.quantity,
    0
  );
  const pickupAvailable = allVariantsLoaded && cartItems.every((item) =>
    (item.variant?.stockByBranch.find((stock) => stock.branchId === branchId)?.stock ?? 0) >= item.quantity
  );
  const deliveryAvailable = allVariantsLoaded && branches.some((branch) =>
    cartItems.every((item) =>
      (item.variant?.stockByBranch.find((stock) => stock.branchId === branch.id)?.stock ?? 0) >= item.quantity
    )
  );

  return {
    cartItems,
    allVariantsLoaded,
    hasEbike,
    subtotal,
    discountTotal,
    pickupReservationAmount,
    homeCreditDownpayment,
    deliveryFee,
    total: subtotal + deliveryFee,
    stockAvailable: fulfillment === 'pickup' ? pickupAvailable : deliveryAvailable,
  };
}
