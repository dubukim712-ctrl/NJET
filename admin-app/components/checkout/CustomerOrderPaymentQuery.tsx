'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { OrderPaymentPanel } from '@/components/checkout/OrderPaymentPanel';
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
  serverNow,
}: {
  userId: string;
  orderId: string;
  serverNow: string;
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
    return (
      <div className="space-y-5">
        <div className="flex justify-end">
          <RealtimeStatus state={realtimeState} />
        </div>
        <div role="status" aria-label="Loading payment details" aria-busy="true">
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
          <div className="mt-5 h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!query.data) {
    return (
      <section className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex justify-end">
          <RealtimeStatus state={realtimeState} />
        </div>
        <h1 className="font-semibold">Payment details unavailable</h1>
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
            <Link href="/dashboard/orders">Return to orders</Link>
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
      <Link
        href="/dashboard/orders"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to orders
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Order payment</p>
        <h1 className="mt-1 break-words text-3xl font-semibold tracking-tight">{query.data.order_number}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order status is {query.data.status.replaceAll('_', ' ')}.
        </p>
      </header>
      {query.isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          Payment details could not be refreshed. Showing the last loaded information.
        </p>
      )}
      <OrderPaymentPanel
        details={query.data}
        serverNow={serverNow}
        userId={userId}
        orderId={orderId}
      />
    </div>
  );
}
