import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import {
  parseAuditAction,
  parseAuditTable,
} from '@/lib/audit';
import { parsePage, singleParam } from '@/lib/search-params';
import { AuditLogsQuery } from '@/components/audit/AuditLogsQuery';

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
  const [{ user, profile }, params] = await Promise.all([
    requirePermission(PERMISSIONS.auditLogsRead, '/admin/audit-logs'),
    searchParams,
  ]);
  return (
    <AuditLogsQuery
      userId={user.id}
      canClear={profile.is_full_access}
      action={parseAuditAction(singleParam(params.action))}
      table={parseAuditTable(singleParam(params.table))}
      page={parsePage(params.page)}
    />
  );
}
