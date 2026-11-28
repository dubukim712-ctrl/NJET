'use client';

import { useAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { RolesQuery } from '@/components/rbac/RolesQuery';

export function RolesContent() {
  const profile = useAdminProfile();

  return (
    <RolesQuery
      userId={profile.id}
      canManage={hasPermission(profile, PERMISSIONS.rolesManage)}
    />
  );
}
