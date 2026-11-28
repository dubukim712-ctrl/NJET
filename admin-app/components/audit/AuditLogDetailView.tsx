'use client';

import { useParams } from 'next/navigation';
import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { AuditLogDetailQuery } from '@/components/audit/AuditLogDetailQuery';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export function AuditLogDetailView() {
  const { id } = useParams<{ id: string }>();
  const profile = useVerifiedAdminProfile();
  if (!profile || !hasPermission(profile, PERMISSIONS.auditLogsRead)) return null;
  return <AuditLogDetailQuery userId={profile.id} id={id}  />;
}
