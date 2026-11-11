'use client';

import { AdminDataFallback } from '@/components/admin/AdminDataFallback';
import { DeliveryZoneManager } from '@/components/admin/commerce/DeliveryZoneManager';
import { Button } from '@/components/ui/Button';
import {
  AdminDeliveryZonesQueryError,
  useAdminDeliveryZonesQuery,
} from '@/data/commerce/admin-delivery-zones-client';

export function DeliveryZonesQuery({
  userId,
  canManage,
}: {
  userId: string;
  canManage: boolean;
}) {
  const query = useAdminDeliveryZonesQuery(userId, canManage);

  if (!query.data && query.isPending) {
    return <AdminDataFallback label="delivery zones" />;
  }

  if (!query.data) {
    const message = query.error instanceof AdminDeliveryZonesQueryError
      ? query.error.message
      : 'Delivery zone data could not be loaded.';
    return (
      <div className="space-y-3">
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert"
        >
          {message}
        </p>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {query.isError && (
        <div className="space-y-2" role="alert">
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {query.error instanceof AdminDeliveryZonesQueryError
              ? query.error.message
              : 'Delivery zone data could not be refreshed.'}
          </p>
          <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
            Try again
          </Button>
        </div>
      )}
      <DeliveryZoneManager
        zones={query.data.zones}
        canManage={query.data.canManage}
      />
    </div>
  );
}
