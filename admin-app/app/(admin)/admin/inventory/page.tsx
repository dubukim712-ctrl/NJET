import { AdminInventoryView } from '@/components/admin/commerce/AdminInventoryView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Inventory valuation' };

export default async function Page() {
  await requirePermission(PERMISSIONS.productsManage, '/admin/inventory');
  return <AdminInventoryView />;
}
