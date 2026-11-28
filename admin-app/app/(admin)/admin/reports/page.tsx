import { AdminReportsView } from '@/components/admin/reports/AdminReportsView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Sales report' };

export default async function Page() {
  await requirePermission(PERMISSIONS.ordersRead, '/admin/reports');
  return <AdminReportsView />;
}
