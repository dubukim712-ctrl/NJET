import { Suspense } from 'react';
import { AdminDataFallback } from '@/components/admin/AdminDataFallback';
import { AuditLogsContent, type AuditLogsSearchParams } from '@/components/audit/AuditLogsContent';

export const metadata = { title: 'Audit Logs' };

interface AuditLogsPageProps {
  searchParams: Promise<AuditLogsSearchParams>;
}

export default function AuditLogsPage({
  searchParams,
}: AuditLogsPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Team &amp; Security</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Audit Logs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review recorded changes. Full-access admins can delete selected entries
          or clear all logs. Clear and delete actions are not recorded.
        </p>
      </div>
      <Suspense fallback={<AdminDataFallback label="audit logs" />}>
        <AuditLogsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
