import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import { isValidAuditId } from '@/lib/audit';
import { AuditLogDetailQuery } from '@/components/audit/AuditLogDetailQuery';

export async function AuditLogDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ user }, { id }] = await Promise.all([
    requirePermission(PERMISSIONS.auditLogsRead, '/admin/audit-logs'),
    params,
  ]);

  if (!isValidAuditId(id)) notFound();

  return <AuditLogDetailQuery userId={user.id} id={id} />;
}
