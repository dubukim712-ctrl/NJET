import { DeliveryZoneManager } from '@/components/admin/commerce/DeliveryZoneManager';
import { requirePermission } from '@/data/auth/guards';
import { getDeliveryZoneManagementData } from '@/data/commerce/admin-queries';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function DeliveryZonesContent() {
  const { supabase, profile } = await requirePermission(PERMISSIONS.deliveryZonesRead, '/admin/delivery-zones');
  const result = await getDeliveryZoneManagementData(supabase);

  if (result.error || !result.data) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
        {result.error ?? 'Delivery zone data is unavailable.'}
      </p>
    );
  }

  return (
    <DeliveryZoneManager
      zones={result.data}
      canManage={hasPermission(profile, PERMISSIONS.deliveryZonesManage)}
    />
  );
}
