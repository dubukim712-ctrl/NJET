'use client';

import { useAdminProfile } from '@/components/providers/AdminProvider';
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCommerceOrdersAction } from '@/data/actions/commerce-orders';
import { customerOrdersQueryKey } from '@/data/commerce/customer-query-keys';
import type { OrderFilters } from '@/lib/validations/order-filters';

export const adminOrdersQueryKey = ['commerce', 'admin-orders'] as const;

export class AdminOrdersQueryError extends Error {}

export function useCommerceOrdersQuery(
  userId: string,
  canManage: boolean,
  filters: OrderFilters
) {
  const { branch_id, is_full_access } = useAdminProfile();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...adminOrdersQueryKey, userId, branch_id, is_full_access, canManage, filters],
    queryFn: async () => {
      const result = await getCommerceOrdersAction(filters);
      if (!result.success) throw new AdminOrdersQueryError(result.error);
      return result.data;
    },
    retry: false,
    refetchOnMount: 'always',
    staleTime: 15_000,
    gcTime: 30 * 60_000,
    placeholderData: (previousData) => previousData,
  });
  const invalidate = useCallback(
    async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...adminOrdersQueryKey, userId],
        }),
        queryClient.invalidateQueries({ queryKey: customerOrdersQueryKey }),
      ]);
    },
    [queryClient, userId]
  );

  return { ...query, invalidate };
}
