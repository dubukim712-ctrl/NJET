'use client';

import { useCallback } from 'react';
import { infiniteQueryOptions, queryOptions, useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { CustomerOrdersCursor, CustomerOrdersPage } from '@/data/commerce/customer-orders';
import { getCustomerOrderDetailsAction, getCustomerOrdersAction, getCustomerReceiptAction } from '@/data/actions/customer-orders';
import { customerOrdersQueryKey } from '@/data/commerce/customer-query-keys';

export class CustomerOrdersQueryError extends Error {}

export function customerOrdersOptions(userId: string) {
  return infiniteQueryOptions({
    queryKey: [...customerOrdersQueryKey, userId],
    initialPageParam: null as CustomerOrdersCursor | null,
    queryFn: async ({ pageParam }): Promise<CustomerOrdersPage> => {
      const result = await getCustomerOrdersAction(pageParam, userId);
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

export function useCustomerOrdersQuery(userId: string) {
  return useInfiniteQuery(customerOrdersOptions(userId));
}

export function useInvalidateCustomerOrdersQuery() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: customerOrdersQueryKey }),
    [queryClient]
  );
}

export function customerOrderDetailsOptions(userId: string, orderId: string) {
  return queryOptions({
    queryKey: [...customerOrdersQueryKey, 'detail', userId, orderId],
    queryFn: () => getCustomerOrderDetailsAction(orderId, userId),
    staleTime: 30_000,
    gcTime: 30 * 60_000,
    retry: false,
  });
}

export function customerReceiptOptions(userId: string, orderId: string) {
  return queryOptions({
    queryKey: [...customerOrdersQueryKey, 'receipt', userId, orderId],
    queryFn: () => getCustomerReceiptAction(orderId, userId),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    retry: false,
  });
}

export function useCustomerOrderDetailsOptions(userId: string, orderId: string) {
  const client = useQueryClient();
  const historyKey = [...customerOrdersQueryKey, userId];
  return {
    ...customerOrderDetailsOptions(userId, orderId),
    initialData: () => client.getQueryData<InfiniteData<CustomerOrdersPage>>(historyKey)
      ?.pages.flatMap((page) => page.orders).find(({ id }) => id === orderId),
    initialDataUpdatedAt: () => client.getQueryState(historyKey)?.dataUpdatedAt,
  };
}
