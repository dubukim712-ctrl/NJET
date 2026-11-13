'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInventoryValuationAction } from '@/data/actions/inventory-valuation';
import type { UserProfile } from '@/types/database';

type InventoryValuationProfile = Pick<
  UserProfile,
  'id' | 'role_id' | 'scope' | 'is_full_access' | 'branch_id' | 'permissions'
>;

export const inventoryValuationQueryKey = ['commerce', 'inventory-valuation'] as const;

export function useInventoryValuationQuery(
  profile: InventoryValuationProfile,
  branchId: string | null,
  page: number,
  pageSize: number
) {
  return useQuery({
    queryKey: [
      ...inventoryValuationQueryKey,
      profile.id,
      profile.role_id,
      profile.scope,
      profile.is_full_access,
      profile.branch_id,
      JSON.stringify(profile.permissions),
      branchId,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const result = await getInventoryValuationAction({ branchId, page, pageSize });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 15_000,
    gcTime: 30 * 60_000,
    placeholderData: (previousData) => previousData,
  });
}

export function useInvalidateInventoryValuationQuery() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: inventoryValuationQueryKey }),
    [queryClient]
  );
}
