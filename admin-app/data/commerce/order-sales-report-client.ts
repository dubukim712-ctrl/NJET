'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOrderSalesReportAction,
  getOrderSalesReportOptionsAction,
} from '@/data/actions/order-sales-report';
import type { OrderSalesReportFilters } from '@/lib/validations/order-sales-report';

export const orderSalesReportQueryKey = ['commerce', 'order-sales-report'] as const;

export class OrderSalesReportQueryError extends Error {}

export function useOrderSalesReportQuery(
  userId: string,
  filters: OrderSalesReportFilters
) {
  return useQuery({
    queryKey: [...orderSalesReportQueryKey, userId, filters],
    queryFn: async () => {
      const result = await getOrderSalesReportAction(filters);
      if (!result.success) throw new OrderSalesReportQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 15_000,
    placeholderData: (previousData) => previousData,
  });
}

export function useOrderSalesReportOptionsQuery(userId: string) {
  return useQuery({
    queryKey: [...orderSalesReportQueryKey, 'options', userId],
    queryFn: async () => {
      const result = await getOrderSalesReportOptionsAction();
      if (!result.success) throw new OrderSalesReportQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 10 * 60_000,
  });
}

export function useInvalidateOrderSalesReportQuery() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: orderSalesReportQueryKey });
}
