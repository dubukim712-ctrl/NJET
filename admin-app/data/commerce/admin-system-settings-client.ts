'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminSystemSettingsAction } from '@/data/actions/admin-system-settings';

export const adminSystemSettingsQueryKey = [
  'commerce',
  'admin-system-settings',
] as const;

export class AdminSystemSettingsQueryError extends Error {}

export function useAdminSystemSettingsQuery(userId: string) {
  return useQuery({
    queryKey: [...adminSystemSettingsQueryKey, userId],
    queryFn: async () => {
      const result = await getAdminSystemSettingsAction();
      if (!result.success) throw new AdminSystemSettingsQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 30_000,
    gcTime: Infinity,
  });
}

export function useInvalidateAdminSystemSettingsQuery() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: adminSystemSettingsQueryKey });
}
