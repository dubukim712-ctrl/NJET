import { WalkInSaleView } from '@/components/admin/commerce/WalkInSaleView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'New Walk-in Sale' };

export default async function NewWalkInSalePage() {
  await requirePermission(PERMISSIONS.ordersManage, '/admin/orders/new');
  return <WalkInSaleView />;
}
