'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminAuditLogAction,
  getAdminAuditLogsAction,
} from '@/data/actions/admin-audit-logs';
import type { AuditAction, AuditTable } from '@/lib/audit';

export const adminAuditLogsQueryKey = ['audit', 'admin-audit-logs'] as const;

export class AdminAuditLogsQueryError extends Error {}

export function useAdminAuditLogsQuery(
  userId: string,
  canClear: boolean,
  action: AuditAction | undefined,
  table: AuditTable | undefined,
  page: number
) {
  return useQuery({
    queryKey: [
      ...adminAuditLogsQueryKey,
      userId,
      canClear,
      action,
      table,
      page,
    ],
    queryFn: async () => {
      const result = await getAdminAuditLogsAction({ action, table, page });
      if (!result.success) throw new AdminAuditLogsQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 15_000,
    gcTime: 30 * 60_000,
  });
}

export function useAdminAuditLogQuery(userId: string, id: string) {
  return useQuery({
    queryKey: [...adminAuditLogsQueryKey, 'detail', userId, id],
    queryFn: async () => {
      const result = await getAdminAuditLogAction(id);
      if (!result.success) throw new AdminAuditLogsQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 30_000,
    gcTime: 30 * 60_000,
  });
}

export function useInvalidateAdminAuditLogsQuery() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: adminAuditLogsQueryKey });
}
