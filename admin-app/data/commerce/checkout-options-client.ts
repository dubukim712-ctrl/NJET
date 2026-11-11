'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCheckoutOptionsAction } from '@/data/actions/checkout-options';

export const checkoutOptionsQueryKey = [
  'commerce',
  'checkout-options',
] as const;

export class CheckoutOptionsQueryError extends Error {}

export function useCheckoutOptionsQuery(userId: string) {
  return useQuery({
    queryKey: [...checkoutOptionsQueryKey, userId],
    queryFn: async () => {
      const result = await getCheckoutOptionsAction();
      if (!result.success) throw new CheckoutOptionsQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 15_000,
  });
}

export function useInvalidateCheckoutOptionsQuery() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: checkoutOptionsQueryKey });
}
