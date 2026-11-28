'use client';

import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { CustomerReceiptQuery } from '@/components/dashboard/CustomerReceiptQuery';
import { useCustomerSessionId } from '@/components/dashboard/CustomerSession';
import { customerReceiptOptions } from '@/data/commerce/customer-orders-client';

export default function ReceiptLoading() {
  const { orderId } = useParams<{ orderId?: string }>();
  const userId = useCustomerSessionId();
  const client = useQueryClient();
  if (orderId && userId && client.getQueryData(customerReceiptOptions(userId, orderId).queryKey)) {
    return <CustomerReceiptQuery orderId={orderId} />;
  }

  return (
    <section className="mx-auto mt-14 max-w-3xl space-y-3 rounded-lg border bg-card p-4 sm:p-8">
      <h1 className="text-xl font-bold">Sales Receipt</h1>
    </section>
  );
}
