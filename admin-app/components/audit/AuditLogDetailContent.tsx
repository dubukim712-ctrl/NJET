import { AuditLogDetailView } from '@/components/audit/AuditLogDetailView';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import { isValidAuditId } from '@/lib/audit';

export async function AuditLogDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [, { id }] = await Promise.all([
    requirePermission(PERMISSIONS.auditLogsRead, '/admin/audit-logs'),
    params,
  ]);

  if (!isValidAuditId(id)) notFound();

  return <AuditLogDetailView />;
}
