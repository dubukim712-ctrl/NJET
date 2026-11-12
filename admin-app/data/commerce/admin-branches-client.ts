'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminBranchesAction } from '@/data/actions/commerce-branches';

export const adminBranchesQueryKey = ['commerce', 'admin-branches'] as const;

export class AdminBranchesQueryError extends Error {}

export function useAdminBranchesQuery(
  userId: string,
  canManage: boolean,
  isBranchScopedStaff: boolean,
  assignedBranchId: string | null
) {
  return useQuery({
    queryKey: [
      ...adminBranchesQueryKey,
      userId,
      canManage,
      isBranchScopedStaff,
      assignedBranchId,
    ],
    queryFn: async () => {
      const result = await getAdminBranchesAction();
      if (!result.success) throw new AdminBranchesQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 30_000,
    gcTime: Infinity,
  });
}

export function useInvalidateAdminBranchesQuery() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminBranchesQueryKey });
}
