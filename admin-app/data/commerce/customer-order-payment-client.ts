'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCustomerOrderPaymentAction } from '@/data/actions/customer-order-payment';
import {
  customerOrderPaymentQueryKey,
} from '@/data/commerce/customer-query-keys';

export class CustomerOrderPaymentQueryError extends Error {}

export function useCustomerOrderPaymentQuery(userId: string, orderId: string) {
  return useQuery({
    queryKey: [...customerOrderPaymentQueryKey, userId, orderId],
    queryFn: async () => {
      const result = await getCustomerOrderPaymentAction(orderId);
      if (!result.success) {
        throw new CustomerOrderPaymentQueryError(result.error);
      }
      return result.data;
    },
    retry: false,
    staleTime: 5_000,
  });
}

export function useInvalidateCustomerOrderPaymentQuery(
  userId: string,
  orderId: string
) {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: [...customerOrderPaymentQueryKey, userId, orderId],
      }),
    [orderId, queryClient, userId]
  );
}
