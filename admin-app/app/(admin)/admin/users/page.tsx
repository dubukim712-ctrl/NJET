import { AdminUsersView } from '@/components/rbac/AdminUsersView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Users' };

export default async function Page() {
  await requirePermission(PERMISSIONS.usersRead, '/admin/users');
  return <AdminUsersView />;
}
