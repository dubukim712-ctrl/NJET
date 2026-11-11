'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollText } from 'lucide-react';
import { AdminDataFallback } from '@/components/admin/AdminDataFallback';
import { AuditLogFilters } from '@/components/audit/AuditLogFilters';
import { AuditLogsTable } from '@/components/audit/AuditLogsTable';
import { AuditPagination } from '@/components/audit/AuditPagination';
import { EmptyState } from '@/components/layout/EmptyState';
import { Button } from '@/components/ui/Button';
import {
  AdminAuditLogsQueryError,
  useAdminAuditLogsQuery,
} from '@/data/audit/admin-audit-logs-client';
import type { AuditAction, AuditTable } from '@/lib/audit';
import { buildAuditLogsHref } from '@/lib/audit';

function auditErrorMessage(error: string): string {
  return error === 'missing_table'
    ? 'The audit log table is missing. Run supabase/migrations/20240101000002_create_audit_logs.sql, then refresh this page.'
    : 'We could not load the audit logs. Please try again.';
}

export function AuditLogsQuery({
  userId,
  canClear,
  action,
  table,
  page,
}: {
  userId: string;
  canClear: boolean;
  action?: AuditAction;
  table?: AuditTable;
  page: number;
}) {
  const router = useRouter();
  const query = useAdminAuditLogsQuery(userId, canClear, action, table, page);
  const totalPages = query.data
    ? Math.max(1, Math.ceil(query.data.total / query.data.pageSize))
    : 1;
  const outOfRange = Boolean(
    query.data && query.data.total > 0 && page > totalPages
  );

  useEffect(() => {
    if (outOfRange) {
      router.replace(buildAuditLogsHref({ page: totalPages, action, table }));
    }
  }, [action, outOfRange, page, router, table, totalPages]);

  if (!query.data && query.isPending) {
    return <AdminDataFallback label="audit logs" />;
  }

  if (!query.data) {
    const message = query.error instanceof AdminAuditLogsQueryError
      ? query.error.message
      : 'We could not load the audit logs. Please try again.';
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {message}
        </p>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
          Try again
        </Button>
      </div>
    );
  }

  if (outOfRange) return <AdminDataFallback label="audit logs" />;

  const { logs, total, pageSize, error, canClear: canClearFromServer } =
    query.data;

  return (
    <div className="space-y-6">
      <AuditLogFilters action={action} table={table} />

      {(query.isError || error) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {error
            ? auditErrorMessage(error)
            : 'We could not refresh the audit logs. The cached records are still shown.'}
        </div>
      )}
      {!error && (
        <>
          {logs.length === 0 && (
            <EmptyState
              icon={ScrollText}
              title="No audit events found"
              description="Changes to users, roles, and role permissions will appear here automatically."
            />
          )}
          <AuditLogsTable logs={logs} canClear={canClearFromServer} />
          {total > 0 && (
            <AuditPagination
              page={page}
              pageSize={pageSize}
              total={total}
              action={action}
              table={table}
            />
          )}
        </>
      )}
    </div>
  );
}
