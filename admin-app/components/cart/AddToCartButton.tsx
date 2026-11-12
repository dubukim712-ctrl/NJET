'use client';

import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/components/cart/CartProvider';
import { Button } from '@/components/ui/Button';

export function AddToCartButton({
  variantId,
  maxQuantity,
}: {
  variantId: string;
  maxQuantity: number | null;
}) {
  const { addItem, items } = useCart();
  const quantity = items.find((item) => item.variantId === variantId)?.quantity ?? 0;
  const atStockLimit = maxQuantity !== null && quantity >= maxQuantity;

  const handleAdd = () => {
    const result = addItem(variantId, maxQuantity);
    if (result.success) {
      toast.success('Added to your cart.');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Button
      type="button"
      className="mt-4 w-full"
      onClick={handleAdd}
      disabled={atStockLimit}
    >
      <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
      {atStockLimit ? 'Maximum available in cart' : 'Add to cart'}
    </Button>
  );
}
