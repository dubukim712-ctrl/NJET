import { redirect } from 'next/navigation';
import { ScrollText } from 'lucide-react';
import { requirePermission } from '@/data/auth/guards';
import { getAuditLogs } from '@/data/audit/queries';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildAuditLogsHref,
  parseAuditAction,
  parseAuditTable,
} from '@/lib/audit';
import { singleParam } from '@/lib/search-params';
import { AuditLogFilters } from '@/components/audit/AuditLogFilters';
import { AuditLogsTable } from '@/components/audit/AuditLogsTable';
import { AuditPagination } from '@/components/audit/AuditPagination';
import { EmptyState } from '@/components/layout/EmptyState';

export type AuditLogsSearchParams = {
  action?: string | string[];
  table?: string | string[];
  page?: string | string[];
};

export async function AuditLogsContent({
  searchParams,
}: {
  searchParams: Promise<AuditLogsSearchParams>;
}) {
  const { profile } = await requirePermission(
    PERMISSIONS.auditLogsRead,
    '/admin/audit-logs'
  );
  const params = await searchParams;
  const action = parseAuditAction(singleParam(params.action));
  const table = parseAuditTable(singleParam(params.table));
  const page = Math.max(1, Number(singleParam(params.page)) || 1);
  const { logs, total, pageSize, error } = await getAuditLogs({ action, table, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total > 0 && page > totalPages) {
    redirect(buildAuditLogsHref({ page: totalPages, action, table }));
  }

  return (
    <div className="space-y-6">
      <AuditLogFilters action={action} table={table} />

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {error === 'missing_table'
            ? 'The audit log table is missing. Run supabase/migrations/20240101000002_create_audit_logs.sql, then refresh this page.'
            : 'We could not load the audit logs. Please try again.'}
        </div>
      ) : (
        <>
          {logs.length === 0 && (
            <EmptyState
              icon={ScrollText}
              title="No audit events found"
              description="Changes to users, roles, and role permissions will appear here automatically."
            />
          )}
          <AuditLogsTable logs={logs} canClear={profile.is_full_access} />
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
