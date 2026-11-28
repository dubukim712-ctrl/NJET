import { AdminOrdersView } from '@/components/admin/commerce/AdminOrdersView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Orders' };

export default async function Page() {
  await requirePermission(PERMISSIONS.ordersRead, '/admin/orders');
  return <AdminOrdersView />;
}
