import { DeliveryZonesQuery } from '@/components/admin/commerce/DeliveryZonesQuery';
import { requirePermission } from '@/data/auth/guards';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function DeliveryZonesContent() {
  const { user, profile } = await requirePermission(
    PERMISSIONS.deliveryZonesRead,
    '/admin/delivery-zones'
  );

  return (
    <DeliveryZonesQuery
      userId={user.id}
      canManage={hasPermission(profile, PERMISSIONS.deliveryZonesManage)}
    />
  );
}
