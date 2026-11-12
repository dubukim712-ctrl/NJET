'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCommerceManagementDataAction } from '@/data/actions/commerce-management';
import {
  cartVariantsQueryKey,
  storefrontCatalogQueryKey,
} from '@/data/commerce/catalog-query-keys';

export const adminProductsQueryKey = ['commerce', 'admin-products'] as const;

export class AdminProductsQueryError extends Error {}

export function useCommerceManagementQuery(
  userId: string,
  canManageProducts: boolean,
  isBranchScopedStaff: boolean,
  assignedBranchId: string | null
) {
  return useQuery({
    queryKey: [
      ...adminProductsQueryKey,
      userId,
      canManageProducts,
      isBranchScopedStaff,
      assignedBranchId,
    ],
    queryFn: async () => {
      const result = await getCommerceManagementDataAction();
      if (!result.success) throw new AdminProductsQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 30_000,
    gcTime: Infinity,
  });
}

export function useInvalidateAdminProductsQuery() {
  const queryClient = useQueryClient();
  return useCallback(
    async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminProductsQueryKey }),
        queryClient.invalidateQueries({ queryKey: storefrontCatalogQueryKey }),
        queryClient.invalidateQueries({ queryKey: cartVariantsQueryKey }),
      ]);
    },
    [queryClient]
  );
}
