import { Suspense } from 'react';
import { AdminDataFallback } from '@/components/admin/AdminDataFallback';
import { DeliveryZonesContent } from '@/components/admin/commerce/DeliveryZonesContent';

export const metadata = { title: 'Delivery zones' };

export default function DeliveryZonesPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Locations</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Delivery zones</h1>
        <p className="mt-2 text-sm text-muted-foreground">Set delivery areas and PHP delivery fees used during checkout.</p>
      </header>
      <Suspense fallback={<AdminDataFallback label="delivery zones" />}>
        <DeliveryZonesContent />
      </Suspense>
    </div>
  );
}
