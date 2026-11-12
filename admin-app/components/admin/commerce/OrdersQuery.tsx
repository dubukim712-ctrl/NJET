'use client';

import { useCallback } from 'react';
import { AdminDataFallback } from '@/components/admin/AdminDataFallback';
import { OrderManager } from '@/components/admin/commerce/OrderManager';
import { RealtimeStatus } from '@/components/realtime/RealtimeStatus';
import { Button } from '@/components/ui/Button';
import {
  AdminOrdersQueryError,
  useCommerceOrdersQuery,
} from '@/data/commerce/admin-orders-client';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
import type { OrderFilters } from '@/lib/validations/order-filters';
import type { RealtimeTable } from '@/types/realtime';
import { useRealtimeChanges } from '@/components/realtime/useRealtimeChanges';

const ORDER_REALTIME_TABLES: RealtimeTable[] = [
  'orders',
  'order_items',
  'order_documents',
  'order_invoices',
  'order_certificates',
  'payment_recipients',
  'branches',
];
const MANAGER_REALTIME_TABLES: RealtimeTable[] = [
  ...ORDER_REALTIME_TABLES,
  'order_home_credit_details',
];

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
  const invalidateQuery = query.invalidate;
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const invalidateOrders = useCallback(() => {
    void invalidateQuery();
  }, [invalidateQuery]);
  const realtimeState = useRealtimeChanges(
    `admin-orders-${userId}`,
    canManage ? MANAGER_REALTIME_TABLES : ORDER_REALTIME_TABLES,
    invalidateOrders
  );

  if (!query.data && query.isPending) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end"><RealtimeStatus state={realtimeState} /></div>
        <AdminDataFallback label="orders" />
      </div>
    );
  }

  if (!query.data) {
    const message = query.error instanceof AdminOrdersQueryError
      ? query.error.message
      : 'Orders could not be loaded. Please try again later.';
    return (
      <div className="space-y-3">
        <div className="flex justify-end"><RealtimeStatus state={realtimeState} /></div>
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
      <div className="mb-3 flex justify-end"><RealtimeStatus state={realtimeState} /></div>
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
