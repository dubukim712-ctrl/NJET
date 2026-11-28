import { AdminAuditLogsView } from '@/components/audit/AdminAuditLogsView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Audit Logs' };

export default async function Page() {
  await requirePermission(PERMISSIONS.auditLogsRead, '/admin/audit-logs');
  return <AdminAuditLogsView />;
}
