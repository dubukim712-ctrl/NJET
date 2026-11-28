'use client';

import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DeliveryZonesContent } from '@/components/admin/commerce/DeliveryZonesContent';

export function AdminDeliveryZonesView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !(hasPermission(profile, PERMISSIONS.deliveryZonesRead))) return null;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Locations</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Delivery zones</h1>
        <p className="mt-2 text-sm text-muted-foreground">Set delivery areas and PHP delivery fees used during checkout.</p>
      </header>
      <DeliveryZonesContent />
    </div>
  );
}
