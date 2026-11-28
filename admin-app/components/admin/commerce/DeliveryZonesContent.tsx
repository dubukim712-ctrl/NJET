'use client';

import { useAdminProfile } from '@/components/providers/AdminProvider';
import { DeliveryZonesQuery } from '@/components/admin/commerce/DeliveryZonesQuery';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export function DeliveryZonesContent() {
  const profile = useAdminProfile();

  return (
    <DeliveryZonesQuery
      userId={profile.id}
      canManage={hasPermission(profile, PERMISSIONS.deliveryZonesManage)}
    />
  );
}
