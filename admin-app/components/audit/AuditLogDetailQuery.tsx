'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdminDataFallback } from '@/components/admin/AdminDataFallback';
import { AuditActionBadge } from '@/components/audit/AuditActionBadge';
import { AuditChanges } from '@/components/audit/AuditChanges';
import { AuditRawData } from '@/components/audit/AuditRawData';
import { Button } from '@/components/ui/Button';
import {
  AdminAuditLogsQueryError,
  useAdminAuditLogQuery,
} from '@/data/audit/admin-audit-logs-client';
import { formatAuditDate } from '@/lib/audit';

export function AuditLogDetailQuery({
  userId,
  id,
}: {
  userId: string;
  id: string;
}) {
  const query = useAdminAuditLogQuery(userId, id);

  if (!query.data && query.isPending) {
    return <AdminDataFallback label="audit entry" />;
  }

  if (!query.data) {
    return (
      <div className="space-y-3">
        <BackLink />
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {query.error instanceof AdminAuditLogsQueryError
            ? query.error.message
            : 'We could not load this audit entry. Please try again.'}
        </p>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
          Try again
        </Button>
      </div>
    );
  }

  const { log, error } = query.data;
  if (error || !log) {
    return (
      <div className="space-y-6">
        <BackLink />
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {error === 'missing_table'
            ? 'The audit log table is missing. Run the audit migration, then refresh this page.'
            : 'We could not load this audit entry. Please try again.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />
      {query.isError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          Could not refresh this audit entry. The cached record is still shown.
        </p>
      )}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Audit entry</h1>
          <AuditActionBadge action={log.action} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          <time dateTime={log.created_at}>{formatAuditDate(log.created_at)}</time>
        </p>
      </div>

      <dl className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Actor</dt>
          <dd className="mt-1 break-all text-sm">{log.actor_email ?? 'System'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Entity</dt>
          <dd className="mt-1 text-sm capitalize">{log.table_name}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Record ID</dt>
          <dd className="mt-1 break-all font-mono text-sm">{log.record_id ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Log ID</dt>
          <dd className="mt-1 break-all font-mono text-sm">{log.id}</dd>
        </div>
      </dl>

      <section aria-labelledby="changes-heading" className="space-y-3">
        <h2 id="changes-heading" className="text-lg font-semibold">Changes</h2>
        <AuditChanges action={log.action} oldData={log.old_data} newData={log.new_data} />
      </section>
      <AuditRawData oldData={log.old_data} newData={log.new_data} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/audit-logs"
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to audit logs
    </Link>
  );
}
