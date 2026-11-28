import { AdminRolesView } from '@/components/rbac/AdminRolesView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Roles' };

export default async function Page() {
  await requirePermission(PERMISSIONS.rolesRead, '/admin/roles');
  return <AdminRolesView />;
}
