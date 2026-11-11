'use client';

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
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [...adminOrdersQueryKey, userId, canManage, filters],
    queryFn: async () => {
      const result = await getCommerceOrdersAction(filters);
      if (!result.success) throw new AdminOrdersQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 15_000,
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
