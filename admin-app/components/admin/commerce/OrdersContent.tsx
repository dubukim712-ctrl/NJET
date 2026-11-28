'use client';

import { useAdminProfile } from '@/components/providers/AdminProvider';
import { useSearchParams } from 'next/navigation';
import { OrdersQuery } from '@/components/admin/commerce/OrdersQuery';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { orderFiltersSchema } from '@/lib/validations/order-filters';

export function OrdersContent() {
  const profile = useAdminProfile();
  const params = useSearchParams();
  const rawView = params.get('view');
  const filters = orderFiltersSchema.parse({
    view: rawView ?? undefined,
    q: params.get('q') ?? undefined,
    status: params.get('status') ?? (rawView === 'completed' ? 'completed' : undefined),
    branch: params.get('branch') ?? undefined,
  });
  const branchLocked =
    profile.scope === 'staff' && !profile.is_full_access;
  const assignedBranchId = branchLocked ? profile.branch_id : null;
  if (branchLocked && !assignedBranchId) {
    return (
      <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground" role="status">
        No branch is assigned to your account. Contact an administrator to access orders.
      </p>
    );
  }
  const canManage = hasPermission(profile, PERMISSIONS.ordersManage);
  const scopedFilters = {
    ...filters,
    branch: assignedBranchId ?? filters.branch,
  };
  return (
    <OrdersQuery
      filters={scopedFilters}
      canManage={canManage}
      userId={profile.id}
      branchLocked={branchLocked}
    />
  );
}
