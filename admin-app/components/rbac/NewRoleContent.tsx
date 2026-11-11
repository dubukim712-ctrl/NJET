import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import { NewRoleQuery } from '@/components/rbac/NewRoleQuery';

export async function NewRoleContent() {
  const { user } = await requirePermission(PERMISSIONS.rolesManage, '/admin/roles/new');
  return <NewRoleQuery userId={user.id} />;
}
