'use server';

import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { getDeliveryZoneManagementData } from '@/data/commerce/admin-queries';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { Database } from '@/types/database';

type DeliveryZone = Database['public']['Tables']['delivery_zones']['Row'];

export type AdminDeliveryZonesData = {
  zones: DeliveryZone[];
  canManage: boolean;
};

export async function getAdminDeliveryZonesAction(): Promise<
  ActionResult<AdminDeliveryZonesData>
> {
  const { supabase, profile } = await requirePermission(
    PERMISSIONS.deliveryZonesRead,
    '/admin/delivery-zones'
  );
  const result = await getDeliveryZoneManagementData(supabase);
  if (!result.data) {
    return {
      success: false,
      error: result.error ?? 'Delivery zone data is unavailable.',
    };
  }
  return {
    success: true,
    data: {
      zones: result.data,
      canManage: hasPermission(profile, PERMISSIONS.deliveryZonesManage),
    },
  };
}
