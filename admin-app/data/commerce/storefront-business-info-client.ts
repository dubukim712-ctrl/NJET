'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStorefrontBusinessInfoAction } from '@/data/actions/storefront-business-info';

export const storefrontBusinessInfoQueryKey = [
  'storefront',
  'business-info',
] as const;

export class StorefrontBusinessInfoQueryError extends Error {}

export function useStorefrontBusinessInfoQuery() {
  return useQuery({
    queryKey: storefrontBusinessInfoQueryKey,
    queryFn: async () => {
      const result = await getStorefrontBusinessInfoAction();
      if (!result.success) {
        throw new StorefrontBusinessInfoQueryError(result.error);
      }
      return result.data;
    },
    retry: false,
    staleTime: 30_000,
    gcTime: Infinity,
  });
}

export function useInvalidateStorefrontBusinessInfoQuery() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: storefrontBusinessInfoQueryKey });
}
