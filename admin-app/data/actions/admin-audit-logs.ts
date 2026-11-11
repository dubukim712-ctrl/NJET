'use server';

import { z } from 'zod';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import {
  getAuditLog,
  getAuditLogs,
} from '@/data/audit/queries';
import { AUDIT_ACTIONS, AUDIT_TABLES, isValidAuditId } from '@/lib/audit';
import { PERMISSIONS } from '@/lib/permissions';
import type { AuditLog } from '@/types/database';

const auditLogsQuerySchema = z.object({
  action: z.enum(AUDIT_ACTIONS).optional(),
  table: z.enum(AUDIT_TABLES).optional(),
  page: z.number().int().min(1),
});

export type AdminAuditLogsData = {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  error: Awaited<ReturnType<typeof getAuditLogs>>['error'];
  canClear: boolean;
};

export async function getAdminAuditLogsAction(
  payload: unknown
): Promise<ActionResult<AdminAuditLogsData>> {
  const { profile } = await requirePermission(
    PERMISSIONS.auditLogsRead,
    '/admin/audit-logs'
  );
  const parsed = auditLogsQuerySchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Invalid audit log filters.' };
  }

  const result = await getAuditLogs(parsed.data);

  return {
    success: true,
    data: {
      ...result,
      canClear: profile.is_full_access,
    },
  };
}

export async function getAdminAuditLogAction(
  id: unknown
): Promise<ActionResult<{ log: AuditLog | null; error: 'missing_table' | 'unknown' | null }>> {
  await requirePermission(PERMISSIONS.auditLogsRead, '/admin/audit-logs');
  const parsedId = z.string().refine(isValidAuditId).safeParse(id);
  if (!parsedId.success) {
    return { success: false, error: 'Invalid audit log ID.' };
  }

  return {
    success: true,
    data: await getAuditLog(parsedId.data),
  };
}
