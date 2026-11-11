'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@/data/auth/guards';
import type { ActionResult } from '@/data/actions/auth';
import { isValidAuditId } from '@/lib/audit';

function isAuditIdList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 100 &&
    value.every((id) => typeof id === 'string' && isValidAuditId(id))
  );
}

export async function clearAuditLogsAction(
  ids: unknown
): Promise<ActionResult<{ deletedCount: number }>> {
  const context = await getAuthContext();

  if (!context) {
    return { success: false, error: 'You must be signed in.' };
  }
  if (!context.profile?.is_full_access) {
    return {
      success: false,
      error: 'Only full-access admins can clear audit logs.',
    };
  }
  if (ids !== null && !isAuditIdList(ids)) {
    return {
      success: false,
      error: 'Choose between 1 and 100 valid audit records.',
    };
  }

  const selectedIds = ids === null ? null : ids;

  try {
    const { data, error } = await context.supabase.rpc('clear_audit_logs', {
      p_ids: selectedIds,
    });

    if (error) {
      console.error('Failed to clear audit logs:', error.message);
      if (error.code === 'PGRST202') {
        return {
          success: false,
          error:
            'The clear-logs migration is missing. Run supabase/migrations/20240101000007_clear_audit_logs.sql.',
        };
      }
      if (error.code === 'P0001') {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Could not clear the audit logs.' };
    }

    revalidatePath('/admin/audit-logs');
    return { success: true, data: { deletedCount: data ?? 0 } };
  } catch (error) {
    console.error('Unexpected error while clearing audit logs:', error);
    return { success: false, error: 'Could not clear the audit logs.' };
  }
}
