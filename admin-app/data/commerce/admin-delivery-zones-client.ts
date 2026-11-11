'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminDeliveryZonesAction } from '@/data/actions/commerce-delivery-zones';

export const adminDeliveryZonesQueryKey = [
  'commerce',
  'admin-delivery-zones',
] as const;

export class AdminDeliveryZonesQueryError extends Error {}

export function useAdminDeliveryZonesQuery(
  userId: string,
  canManage: boolean
) {
  return useQuery({
    queryKey: [...adminDeliveryZonesQueryKey, userId, canManage],
    queryFn: async () => {
      const result = await getAdminDeliveryZonesAction();
      if (!result.success) throw new AdminDeliveryZonesQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 30_000,
  });
}

export function useInvalidateAdminDeliveryZonesQuery() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({
    queryKey: adminDeliveryZonesQueryKey,
  });
}
