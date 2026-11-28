'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { OrderPaymentPanel } from '@/components/checkout/OrderPaymentPanel';
import { CustomerOrderPaymentSkeleton } from '@/components/checkout/CustomerOrderPaymentSkeleton';
import { RealtimeStatus } from '@/components/realtime/RealtimeStatus';
import { useRealtimeChanges } from '@/components/realtime/useRealtimeChanges';
import {
  CustomerOrderPaymentQueryError,
  useCustomerOrderPaymentQuery,
  useInvalidateCustomerOrderPaymentQuery,
} from '@/data/commerce/customer-order-payment-client';
import { useInvalidateCustomerOrdersQuery } from '@/data/commerce/customer-orders-client';
import type { RealtimeTable } from '@/types/realtime';

const CUSTOMER_ORDER_PAYMENT_REALTIME_TABLES: readonly RealtimeTable[] = [
  'orders',
  'order_documents',
  'payment_recipients',
];

export function CustomerOrderPaymentQuery({
  userId,
  orderId,
}: {
  userId: string;
  orderId: string;
}) {
  const query = useCustomerOrderPaymentQuery(userId, orderId);
  const invalidatePayment = useInvalidateCustomerOrderPaymentQuery(userId, orderId);
  const invalidateOrders = useInvalidateCustomerOrdersQuery();
  const refreshOrder = useCallback(() => {
    void Promise.all([invalidatePayment(), invalidateOrders()]);
  }, [invalidateOrders, invalidatePayment]);
  const realtimeState = useRealtimeChanges(
    `customer-order-payment-${userId}-${orderId}`,
    CUSTOMER_ORDER_PAYMENT_REALTIME_TABLES,
    refreshOrder
  );

  if (!query.data && query.isPending) {
    return <CustomerOrderPaymentSkeleton realtimeState={realtimeState} />;
  }

  if (!query.data) {
    return (
      <section className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex justify-end">
          <RealtimeStatus state={realtimeState} />
        </div>
        <h2 className="font-semibold">Payment details unavailable</h2>
        <p className="text-sm text-muted-foreground" role="alert">
          {query.error instanceof CustomerOrderPaymentQueryError
            ? query.error.message
            : 'Payment details could not be loaded. Please try again later.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
            Try again
          </Button>
          <Button asChild variant="link">
            <Link href="/orders">Return to orders</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <RealtimeStatus state={realtimeState} />
      </div>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">Order payment</p>
        <h2 className="mt-1 break-words text-3xl font-semibold tracking-tight">{query.data.details.order_number}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order status is {query.data.details.status.replaceAll('_', ' ')}.
        </p>
      </header>
      {query.isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          Payment details could not be refreshed. Showing the last loaded information.
        </p>
      )}
      <OrderPaymentPanel
        details={query.data.details}
        serverClockOffsetMs={query.data.serverNow - query.dataUpdatedAt}
        userId={userId}
        orderId={orderId}
      />
    </div>
  );
}
