'use client';

import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { CustomerOrderDetailQuery } from '@/components/dashboard/CustomerOrderDetailQuery';
import { useCustomerSessionId } from '@/components/dashboard/CustomerSession';
import { useCustomerOrderDetailsOptions } from '@/data/commerce/customer-orders-client';
import { SmartLink } from '@/components/ui/SmartLink';

export default function OrderDetailsLoading() {
  const { orderId } = useParams<{ orderId?: string }>();
  const userId = useCustomerSessionId();
  const options = useCustomerOrderDetailsOptions(userId, orderId ?? '');
  const client = useQueryClient();
  const ready = userId && orderId && (client.getQueryData(options.queryKey) ?? options.initialData());

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <SmartLink href="/orders" prefetch={true} className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
          Back to orders
        </SmartLink>
        <h1 className="text-3xl font-semibold tracking-tight">Order details</h1>
      </header>
      {ready && orderId && <CustomerOrderDetailQuery orderId={orderId} />}
    </div>
  );
}
