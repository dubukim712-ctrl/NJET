import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireCustomer } from '@/data/auth/guards';
import { getCustomerOrderPayment } from '@/data/commerce/customer-payment';
import { OrderPaymentPanel } from '@/components/checkout/OrderPaymentPanel';

export const metadata = { title: 'Order payment | NJET' };

export default async function OrderPaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
    notFound();
  }
  const { supabase } = await requireCustomer(`/dashboard/orders/${orderId}`);
  const result = await getCustomerOrderPayment(supabase, orderId);
  if (!result.data) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
        <h1 className="font-semibold">Payment details unavailable</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.error ?? 'This payment-required order could not be found.'}
        </p>
        <Link href="/dashboard/orders" className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline">
          Return to orders
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/orders"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to orders
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Order payment</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{result.data.order_number}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order status is {result.data.status.replaceAll('_', ' ')}.
        </p>
      </header>
      <OrderPaymentPanel details={result.data} serverNow={new Date().toISOString()} />
    </div>
  );
}
