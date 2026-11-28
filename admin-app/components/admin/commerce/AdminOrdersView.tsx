'use client';

import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  OrdersContent,
} from '@/components/admin/commerce/OrdersContent';

export function AdminOrdersView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !(hasPermission(profile, PERMISSIONS.ordersRead))) return null;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Commerce</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage online orders and completed walk-in sales. Online order stock is deducted atomically on confirmation.</p>
      </header>
      <OrdersContent />
    </div>
  );
}
