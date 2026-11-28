'use client';

import { useParams } from 'next/navigation';
import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { RoleDetailQuery } from '@/components/rbac/RoleDetailQuery';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export function RoleDetailView() {
  const { id } = useParams<{ id: string }>();
  const profile = useVerifiedAdminProfile();
  if (!profile || !hasPermission(profile, PERMISSIONS.rolesRead)) return null;
  return <RoleDetailQuery userId={profile.id} roleId={id} permissionSignature={[profile.scope, profile.is_full_access, ...profile.permissions.slice().sort()].join(':')} />;
}
