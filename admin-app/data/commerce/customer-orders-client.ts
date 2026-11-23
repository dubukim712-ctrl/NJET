'use client';

import { useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomerOrdersCursor, CustomerOrdersPage } from '@/data/commerce/customer-orders';
import { getCustomerOrdersAction } from '@/data/actions/customer-orders';
import { customerOrdersQueryKey } from '@/data/commerce/customer-query-keys';

export class CustomerOrdersQueryError extends Error {}

export function useCustomerOrdersQuery(userId: string) {
  return useInfiniteQuery({
    queryKey: [...customerOrdersQueryKey, userId],
    initialPageParam: null as CustomerOrdersCursor | null,
    queryFn: async ({ pageParam }): Promise<CustomerOrdersPage> => {
      const result = await getCustomerOrdersAction(pageParam);
      if (!result.success) throw new CustomerOrdersQueryError(result.error);
      return result.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(userId),
    retry: false,
    staleTime: 15_000,
    gcTime: Infinity,
  });
}

export function useInvalidateCustomerOrdersQuery() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: customerOrdersQueryKey }),
    [queryClient]
  );
}
