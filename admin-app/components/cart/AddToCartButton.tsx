'use client';

import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/components/cart/CartProvider';
import { MAX_CART_QUANTITY } from '@/data/cart';
import { useCartQuantityAvailability } from '@/data/commerce/cart-quantity-availability';
import { Button } from '@/components/ui/Button';

export function AddToCartButton({
  variantId,
  maxQuantity,
  branchId,
}: {
  variantId: string;
  maxQuantity: number | null;
  branchId: string;
}) {
  const { addItem, items } = useCart();
  // Checkout has one line per variant. Changing branches moves the whole line.
  const item = items.find((entry) => entry.variantId === variantId);
  const nextQuantity = (item?.quantity ?? 0) + 1;
  const needsAvailability = maxQuantity === null && nextQuantity <= MAX_CART_QUANTITY;
  const availability = useCartQuantityAvailability(variantId, branchId, nextQuantity, needsAvailability);
  const atStockLimit = nextQuantity > (maxQuantity ?? MAX_CART_QUANTITY) || (needsAvailability && availability.data === false);
  const checkingAvailability = needsAvailability && availability.isPending;
  const availabilityFailed = needsAvailability && availability.isError;
  const label = checkingAvailability ? 'Checking availability?'
    : availabilityFailed ? 'Availability could not be checked'
    : atStockLimit && !item ? 'Out of stock'
    : atStockLimit && item?.branchId && item.branchId !== branchId ? 'Cart quantity unavailable at this branch'
    : atStockLimit ? 'Maximum available quantity in cart'
    : item?.branchId && item.branchId !== branchId ? 'Move to this branch and add one'
    : 'Add to cart';

  const handleAdd = () => {
    const result = addItem(variantId, maxQuantity ?? nextQuantity, branchId);
    if (result.success) {
      toast.success('Added to your cart.');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      <Button
        type="button"
        className="mt-4 w-full"
        onClick={handleAdd}
        disabled={atStockLimit || checkingAvailability || availabilityFailed}
      >
        <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
      {availabilityFailed && (
        <button type="button" className="mt-2 min-h-11 underline" onClick={() => void availability.refetch()}>
          Retry availability check
        </button>
      )}
    </>
  );
}
