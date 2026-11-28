'use client';

import { useAdminProfile } from '@/components/providers/AdminProvider';
import { useSearchParams } from 'next/navigation';
import {
  parseAuditAction,
  parseAuditTable,
} from '@/lib/audit';
import { parsePage } from '@/lib/search-params';
import { AuditLogsQuery } from '@/components/audit/AuditLogsQuery';

export function AuditLogsContent() {
  const profile = useAdminProfile();
  const params = useSearchParams();
  return (
    <AuditLogsQuery
      userId={profile.id}
      canClear={profile.is_full_access}
      action={parseAuditAction(params.get('action') ?? undefined)}
      table={parseAuditTable(params.get('table') ?? undefined)}
      page={parsePage(params.get('page') ?? undefined)}
    />
  );
}
