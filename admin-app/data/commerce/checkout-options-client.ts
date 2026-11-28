'use client';

import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCheckoutOptionsAction } from '@/data/actions/checkout-options';

export const checkoutOptionsQueryKey = [
  'commerce',
  'checkout-options',
] as const;

export class CheckoutOptionsQueryError extends Error {}

export function checkoutOptions(userId: string) {
  return queryOptions({
    queryKey: [...checkoutOptionsQueryKey, userId],
    queryFn: async () => {
      const result = await getCheckoutOptionsAction(userId);
      if (!result.success) throw new CheckoutOptionsQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 15_000,
    gcTime: 30 * 60_000,
  });
}

export function useCheckoutOptionsQuery(userId: string) {
  return useQuery({ ...checkoutOptions(userId), refetchOnMount: 'always' });
}

export function useInvalidateCheckoutOptionsQuery() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: checkoutOptionsQueryKey });
}
