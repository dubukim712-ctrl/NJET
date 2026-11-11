'use client';

import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/components/cart/CartProvider';
import { Button } from '@/components/ui/Button';

export function AddToCartButton({ variantId }: { variantId: string }) {
  const { addItem } = useCart();

  const handleAdd = () => {
    const result = addItem(variantId);
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
    >
      <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
      Add to cart
    </Button>
  );
}
