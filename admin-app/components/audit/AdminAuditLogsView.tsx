'use client';

import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AuditLogsContent } from '@/components/audit/AuditLogsContent';

export function AdminAuditLogsView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !(hasPermission(profile, PERMISSIONS.auditLogsRead))) return null;
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
      <AuditLogsContent />
    </div>
  );
}
