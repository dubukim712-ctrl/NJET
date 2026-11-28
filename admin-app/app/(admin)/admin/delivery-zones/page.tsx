import { AdminDeliveryZonesView } from '@/components/admin/commerce/AdminDeliveryZonesView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Delivery zones' };

export default async function Page() {
  await requirePermission(PERMISSIONS.deliveryZonesRead, '/admin/delivery-zones');
  return <AdminDeliveryZonesView />;
}
