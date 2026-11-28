'use client';

import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { OrderSalesReport } from '@/components/admin/reports/OrderSalesReport';

export function AdminReportsView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !(hasPermission(profile, PERMISSIONS.ordersRead))) return null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Commerce</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Sales report</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Review completed order sales, verified collections, cost-backed profit, and outstanding balances.
        </p>
      </header>
      <OrderSalesReport
        userId={profile.id}
        canManage={hasPermission(profile, PERMISSIONS.ordersManage)}
      />
    </div>
  );
}
