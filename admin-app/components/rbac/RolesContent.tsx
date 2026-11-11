import { requirePermission } from '@/data/auth/guards';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { RolesQuery } from '@/components/rbac/RolesQuery';

export async function RolesContent() {
  const { user, profile } = await requirePermission(PERMISSIONS.rolesRead, '/admin/roles');

  return (
    <RolesQuery
      userId={user.id}
      canManage={hasPermission(profile, PERMISSIONS.rolesManage)}
    />
  );
}
