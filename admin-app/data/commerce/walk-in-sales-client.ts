'use client';

import { queryOptions } from '@tanstack/react-query';
import { getWalkInCatalogAction } from '@/data/actions/walk-in-sales';

export class WalkInCatalogQueryError extends Error {}

export function walkInCatalogQueryOptions(branchId: string) {
  return queryOptions({
    queryKey: ['commerce', 'walk-in-catalog', branchId],
    queryFn: async () => {
      const result = await getWalkInCatalogAction(branchId);
      if (!result.success) throw new WalkInCatalogQueryError(result.error);
      return result.data;
    },
    staleTime: 30_000,
    retry: false,
  });
}
