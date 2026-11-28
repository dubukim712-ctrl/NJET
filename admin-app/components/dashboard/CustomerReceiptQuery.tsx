'use client';

import { useQuery } from '@tanstack/react-query';
import { useCustomerSessionId } from '@/components/dashboard/CustomerSession';
import { PrintableSalesReceipt } from '@/components/commerce/PrintableSalesReceipt';
import { CustomerOrderLink } from '@/components/dashboard/CustomerOrderLink';
import { Button } from '@/components/ui/Button';
import { customerReceiptOptions } from '@/data/commerce/customer-orders-client';

export function CustomerReceiptQuery({ orderId }: { orderId: string }) {
  const userId = useCustomerSessionId();
  const query = useQuery({ ...customerReceiptOptions(userId, orderId), enabled: Boolean(userId) });
  const result = userId ? query.data : undefined;

  const backLink = (
    <CustomerOrderLink orderId={orderId} className="inline-flex min-h-11 items-center text-sm font-medium underline">
      Back to Order
    </CustomerOrderLink>
  );
  if (result) return <PrintableSalesReceipt {...result} backLink={backLink} />;

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center justify-between gap-3 print:hidden">{backLink}</div>
      <section className="space-y-3 rounded-lg border bg-card p-4 sm:p-8">
        <h1 className="text-xl font-bold">Sales Receipt</h1>
        {query.isPending || !userId ? (
          <div role="status" aria-label="Loading receipt" className="h-48 animate-pulse rounded-md bg-muted" />
        ) : query.isError ? (
          <>
            <p role="alert">The receipt could not be loaded.</p>
            <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>
          </>
        ) : <p role="status">A receipt is unavailable for this order.</p>}
      </section>
    </div>
  );
}
