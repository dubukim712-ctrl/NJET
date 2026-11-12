'use client';

import { useQuery } from '@tanstack/react-query';
import { getStorefrontBranchesAction } from '@/data/actions/storefront-branches';

export const storefrontBranchesQueryKey = [
  'storefront',
  'branch-locations',
] as const;

export class StorefrontBranchesQueryError extends Error {}

export function useStorefrontBranchesQuery() {
  return useQuery({
    queryKey: storefrontBranchesQueryKey,
    queryFn: async () => {
      const result = await getStorefrontBranchesAction();
      if (!result.success) {
        throw new StorefrontBranchesQueryError(result.error);
      }
      return result.data;
    },
    retry: false,
    staleTime: 30_000,
    gcTime: Infinity,
  });
}
