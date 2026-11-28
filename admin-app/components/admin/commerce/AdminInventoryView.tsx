'use client';

import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { InventoryValuationReport } from '@/components/admin/commerce/InventoryValuationReport';

export function AdminInventoryView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !(hasPermission(profile, PERMISSIONS.productsManage))) return null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Commerce</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Inventory valuation</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Review on-hand quantities, known receipt costs, and stock whose historical cost is not available.
        </p>
      </header>
      <InventoryValuationReport profile={profile} />
    </div>
  );
}
