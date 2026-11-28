import { AdminBranchesView } from '@/components/admin/commerce/AdminBranchesView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Branches' };

export default async function Page() {
  await requirePermission(PERMISSIONS.branchesRead, '/admin/branches');
  return <AdminBranchesView />;
}
