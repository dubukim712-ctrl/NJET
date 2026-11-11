import { OrderManager } from '@/components/admin/commerce/OrderManager';
import { requirePermission } from '@/data/auth/guards';
import { getCommerceOrders } from '@/data/commerce/admin-orders';
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
  const { supabase, profile } = await requirePermission(PERMISSIONS.ordersRead, '/admin/orders');
  if (profile.scope === 'staff' && !profile.is_full_access && !profile.branch_id) {
    return (
      <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground" role="status">
        No branch is assigned to your account. Contact an administrator to access orders.
      </p>
    );
  }
  const canManage = hasPermission(profile, PERMISSIONS.ordersManage);
  const result = await getCommerceOrders(supabase, filters, canManage);

  if (result.error || !result.data) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
        {result.error ?? 'Order data is unavailable.'}
      </p>
    );
  }

  return (
    <OrderManager
      orders={result.data}
      branches={result.branches}
      filters={filters}
      canManage={canManage}
    />
  );
}
