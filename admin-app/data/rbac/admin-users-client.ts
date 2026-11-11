'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminUsersAction } from '@/data/actions/admin-users';

export const adminUsersQueryKey = ['rbac', 'admin-users'] as const;

export class AdminUsersQueryError extends Error {}

export function useAdminUsersQuery(
  userId: string,
  canManage: boolean,
  search: string | undefined,
  roleId: string | undefined,
  page: number
) {
  return useQuery({
    queryKey: [...adminUsersQueryKey, userId, canManage, search, roleId, page],
    queryFn: async () => {
      const result = await getAdminUsersAction({ search, roleId, page });
      if (!result.success) throw new AdminUsersQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 30_000,
  });
}

export function useInvalidateAdminUsersQuery() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminUsersQueryKey });
}
