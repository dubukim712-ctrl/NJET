'use client';

import { useRealtimeChanges } from '@/components/realtime/useRealtimeChanges';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCustomerSessionId } from '@/components/dashboard/CustomerSession';
import { CustomerOrderCard } from '@/components/dashboard/CustomerOrderCard';
import { CustomerOrderPaymentQuery } from '@/components/checkout/CustomerOrderPaymentQuery';
import { Button } from '@/components/ui/Button';
import { customerOrdersOptions, customerReceiptOptions, useCustomerOrderDetailsOptions, useInvalidateCustomerOrdersQuery } from '@/data/commerce/customer-orders-client';

export function CustomerOrderDetailQuery({ orderId }: { orderId: string }) {
  const userId = useCustomerSessionId();
  const query = useQuery({ ...useCustomerOrderDetailsOptions(userId, orderId), enabled: Boolean(userId) });
  const invalidateOrders = useInvalidateCustomerOrdersQuery();
  useRealtimeChanges(
    'customer-order-detail-' + userId + '-' + orderId,
    userId ? ['orders', 'order_invoices'] : [],
    invalidateOrders,
  );
  const order = userId ? query.data : undefined;
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const options = customerOrdersOptions(userId);
    if (!queryClient.getQueryData(options.queryKey)) void queryClient.prefetchInfiniteQuery(options);
  }, [queryClient, userId]);

  const completed = order?.status === 'completed';
  useEffect(() => {
    if (userId && completed) void queryClient.prefetchQuery(customerReceiptOptions(userId, orderId));
  }, [completed, orderId, queryClient, userId]);

  if (!order && (query.isPending || !userId)) {
    return <div role="status" aria-label="Loading order details" className="h-60 animate-pulse rounded-xl border bg-muted" />;
  }
  if (!order) {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-5">
        <p role="alert">{query.isError ? 'Order details could not be loaded.' : 'This order is unavailable.'}</p>
        {query.isError && <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>}
      </div>
    );
  }

  const showPayment = (order.payment_method === 'online' || order.home_credit_downpayment_due_minor > 0)
    && ['awaiting_payment', 'awaiting_confirmation', 'expired'].includes(order.status);
  return (
    <>
      {showPayment && <CustomerOrderPaymentQuery userId={userId} orderId={orderId} />}
      <ul aria-label="Order details">
        <CustomerOrderCard order={order} isPlaced={false} showDetailsLink={false} />
      </ul>
    </>
  );
}
