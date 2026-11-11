import { requirePermission } from '@/data/auth/guards';
import { getPermissions } from '@/data/rbac/queries';
import { PERMISSIONS } from '@/lib/permissions';
import { CreateRoleForm } from '@/components/rbac/CreateRoleForm';

export async function NewRoleContent() {
  await requirePermission(PERMISSIONS.rolesManage, '/admin/roles/new');
  const { permissions, error } = await getPermissions();

  return error ? (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
      We could not load the permission catalog. Run the permissions migration, then refresh this page.
    </div>
  ) : (
    <div className="max-w-3xl">
      <CreateRoleForm permissions={permissions} />
    </div>
  );
}
