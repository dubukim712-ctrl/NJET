'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCustomerOrdersAction } from '@/data/actions/customer-orders';
import { customerOrdersQueryKey } from '@/data/commerce/customer-query-keys';

export class CustomerOrdersQueryError extends Error {}

export function useCustomerOrdersQuery(userId: string) {
  return useQuery({
    queryKey: [...customerOrdersQueryKey, userId],
    queryFn: async () => {
      const result = await getCustomerOrdersAction();
      if (!result.success) throw new CustomerOrdersQueryError(result.error);
      return result.data;
    },
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
