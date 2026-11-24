'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/data/supabase/client';

export function useCartQuantityAvailability(
  variantId: string,
  branchId: string | undefined,
  quantity: number,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['cart-quantity-availability', variantId, branchId ?? null, quantity],
    queryFn: async () => {
      const { data, error } = await createClient().rpc('storefront_can_order_quantity', {
        p_variant_id: variantId,
        p_branch_id: branchId ?? null,
        p_quantity: quantity,
      });
      if (error) throw error;
      return data === true;
    },
    enabled,
    retry: false,
    staleTime: 5_000,
  });
}
