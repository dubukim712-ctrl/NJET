'use client';

import { AdminDataFallback } from '@/components/admin/AdminDataFallback';
import { OrderManager } from '@/components/admin/commerce/OrderManager';
import { Button } from '@/components/ui/Button';
import {
  AdminOrdersQueryError,
  useCommerceOrdersQuery,
} from '@/data/commerce/admin-orders-client';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
import type { OrderFilters } from '@/lib/validations/order-filters';

export function OrdersQuery({
  filters,
  canManage,
  userId,
}: {
  filters: OrderFilters;
  canManage: boolean;
  userId: string;
}) {
  const query = useCommerceOrdersQuery(userId, canManage, filters);
  const invalidateProducts = useInvalidateAdminProductsQuery();

  if (!query.data && query.isPending) {
    return <AdminDataFallback label="orders" />;
  }

  if (!query.data) {
    const message = query.error instanceof AdminOrdersQueryError
      ? query.error.message
      : 'Orders could not be loaded. Please try again later.';
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          {message}
        </p>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <>
      {query.isError && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {query.error instanceof AdminOrdersQueryError
            ? query.error.message
            : 'Orders could not be refreshed. Please try again.'}
        </p>
      )}
      <OrderManager
        orders={query.data.orders}
        branches={query.data.branches}
        filters={filters}
        canManage={canManage}
        onDataChanged={() => {
          void query.invalidate();
          void invalidateProducts();
        }}
      />
    </>
  );
}
