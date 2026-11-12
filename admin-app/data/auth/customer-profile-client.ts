'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCustomerProfileAction } from '@/data/actions/profile';
import { customerProfileQueryKey } from '@/data/commerce/customer-query-keys';

export class CustomerProfileQueryError extends Error {}

export function useCustomerProfileQuery(userId: string) {
  return useQuery({
    queryKey: [...customerProfileQueryKey, userId],
    queryFn: async () => {
      const result = await getCustomerProfileAction();
      if (!result.success) throw new CustomerProfileQueryError(result.error);
      return result.data;
    },
    enabled: Boolean(userId),
    retry: false,
    staleTime: 30_000,
    gcTime: Infinity,
  });
}

export function useInvalidateCustomerProfileQuery(userId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: [...customerProfileQueryKey, userId],
    });
}
