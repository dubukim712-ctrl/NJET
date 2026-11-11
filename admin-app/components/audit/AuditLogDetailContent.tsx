import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requirePermission } from '@/data/auth/guards';
import { getAuditLog } from '@/data/audit/queries';
import { PERMISSIONS } from '@/lib/permissions';
import { formatAuditDate, isValidAuditId } from '@/lib/audit';
import { AuditActionBadge } from '@/components/audit/AuditActionBadge';
import { AuditChanges } from '@/components/audit/AuditChanges';
import { AuditRawData } from '@/components/audit/AuditRawData';

export async function AuditLogDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.auditLogsRead, '/admin/audit-logs');
  const { id } = await params;

  if (!isValidAuditId(id)) notFound();

  const { log, error } = await getAuditLog(id);
  if (error) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {error === 'missing_table'
            ? 'The audit log table is missing. Run the audit migration, then refresh this page.'
            : 'We could not load this audit entry. Please try again.'}
        </div>
      </div>
    );
  }
  if (!log) notFound();

  return (
    <div className="space-y-6">
      <BackLink />
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
