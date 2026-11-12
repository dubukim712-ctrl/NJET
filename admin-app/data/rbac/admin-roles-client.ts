'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminRoleCreationDataAction,
  getAdminRoleDetailAction,
  getAdminRolesAction,
} from '@/data/actions/admin-roles';

export const adminRolesQueryKey = ['rbac', 'admin-roles'] as const;

export class AdminRolesQueryError extends Error {}

export function useAdminRolesQuery(userId: string, canManage: boolean) {
  return useQuery({
    queryKey: [...adminRolesQueryKey, 'list', userId, canManage],
    queryFn: async () => {
      const result = await getAdminRolesAction();
      if (!result.success) throw new AdminRolesQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 30_000,
    gcTime: Infinity,
  });
}

export function useAdminRoleDetailQuery(
  userId: string,
  permissionSignature: string,
  roleId: string
) {
  return useQuery({
    queryKey: [...adminRolesQueryKey, 'detail', userId, permissionSignature, roleId],
    queryFn: async () => {
      const result = await getAdminRoleDetailAction(roleId);
      if (!result.success) throw new AdminRolesQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 30_000,
    gcTime: Infinity,
  });
}

export function useAdminRoleCreationDataQuery(userId: string) {
  return useQuery({
    queryKey: [...adminRolesQueryKey, 'creation', userId],
    queryFn: async () => {
      const result = await getAdminRoleCreationDataAction();
      if (!result.success) throw new AdminRolesQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 5 * 60_000,
    gcTime: Infinity,
  });
}

export function useInvalidateAdminRolesQuery() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminRolesQueryKey });
}
