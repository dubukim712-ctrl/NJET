import { OrdersQuery } from '@/components/admin/commerce/OrdersQuery';
import { requirePermission } from '@/data/auth/guards';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { orderFiltersSchema } from '@/lib/validations/order-filters';

export type OrdersSearchParams = {
  q?: string | string[];
  status?: string | string[];
  branch?: string | string[];
};

function firstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export async function OrdersContent({
  searchParams,
}: {
  searchParams: Promise<OrdersSearchParams>;
}) {
  const params = await searchParams;
  const filters = orderFiltersSchema.parse({
    q: firstSearchParam(params.q),
    status: firstSearchParam(params.status),
    branch: firstSearchParam(params.branch),
  });
  const { profile } = await requirePermission(PERMISSIONS.ordersRead, '/admin/orders');
  if (profile.scope === 'staff' && !profile.is_full_access && !profile.branch_id) {
    return (
      <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground" role="status">
        No branch is assigned to your account. Contact an administrator to access orders.
      </p>
    );
  }
  const canManage = hasPermission(profile, PERMISSIONS.ordersManage);
  return (
    <OrdersQuery
      filters={filters}
      canManage={canManage}
      userId={profile.id}
    />
  );
}
