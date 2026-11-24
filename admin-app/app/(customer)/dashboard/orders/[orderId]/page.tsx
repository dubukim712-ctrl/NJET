import Link from 'next/link';
import { CustomerOrderCard } from '@/components/dashboard/CustomerOrderCard';
import { getCustomerOrders } from '@/data/commerce/customer-orders';
import { notFound } from 'next/navigation';
import { requireCustomer } from '@/data/auth/guards';
import { CustomerOrderPaymentQuery } from '@/components/checkout/CustomerOrderPaymentQuery';
import { customerOrderIdSchema } from '@/lib/validations/commerce';

export const metadata = { title: 'Order details' };

export default async function OrderPaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  if (!customerOrderIdSchema.safeParse(orderId).success) {
    notFound();
  }
  const { user, supabase } = await requireCustomer(`/dashboard/orders/${orderId}`);
  const { data, error } = await getCustomerOrders(supabase, user.id, null, orderId);
  const order = data?.orders[0];
  if (error) throw new Error(error);
  if (!order) notFound();

  const showPayment = (order.payment_method === 'online' || order.home_credit_downpayment_due_minor > 0)
    && ['awaiting_payment', 'awaiting_confirmation', 'expired'].includes(order.status);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {showPayment ? (
        <CustomerOrderPaymentQuery userId={user.id} orderId={orderId} serverNow={new Date().toISOString()} />
      ) : (
        <header className="space-y-3">
          <Link href="/dashboard/orders" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
            Back to orders
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Order details</h1>
        </header>
      )}
      <ul aria-label="Order details">
        <CustomerOrderCard order={order} isPlaced={false} showDetailsLink={false} />
      </ul>
    </div>
  );
}
