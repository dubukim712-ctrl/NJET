import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrderStatusBadge } from '@/components/commerce/OrderStatusBadge';
import { CustomerConfirmationCard } from '@/components/dashboard/CustomerConfirmationCard';
import { Button } from '@/components/ui/Button';
import { requireCustomer } from '@/data/auth/guards';
import { formatPhp } from '@/lib/commerce';
import { isPaymentProofDue, orderConfirmationPath } from '@/lib/customer-confirmation';
import { customerOrderIdSchema } from '@/lib/validations/commerce';

export const metadata = { title: 'Order placed' };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string | string[] }>;
}) {
  const id = customerOrderIdSchema.safeParse((await searchParams).orderId);
  if (!id.success) notFound();
  const { supabase, user } = await requireCustomer(orderConfirmationPath(id.data));
  const { data: order, error } = await supabase.from('orders')
    .select('order_number, status, fulfillment, branch_name, delivery_zone_name, total_minor, reservation_due_minor, online_due_minor, home_credit_downpayment_due_minor, payment_expires_at')
    .eq('customer_id', user.id)
    .eq('id', id.data)
    .maybeSingle();
  if (error) throw new Error('Order confirmation could not be loaded.');
  if (!order) notFound();

  const proofDue = isPaymentProofDue(order);
  const details = `/orders/${id.data}`;
  const amountDue = order.home_credit_downpayment_due_minor || order.online_due_minor;

  return (
    <CustomerConfirmationCard
      title="Order placed"
      reference={order.order_number}
      status={<OrderStatusBadge status={order.status} />}
      actions={
        <>
          <Button asChild className="min-h-11">
            <Link href={details}>{proofDue ? 'Proceed to payment proof' : 'View order details'}</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11"><Link href="/shop">Continue shopping</Link></Button>
        </>
      }
    >
      <dl className="grid gap-3 rounded-xl bg-muted/50 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Fulfillment</dt>
          <dd>{order.fulfillment === 'pickup' ? 'Pick up at store' : 'Delivery'}</dd>
          <dd>{order.fulfillment === 'pickup' ? order.branch_name : order.delivery_zone_name}</dd>
        </div>
        <div><dt className="text-muted-foreground">Order total</dt><dd>{formatPhp(order.total_minor)}</dd></div>
        {order.reservation_due_minor > 0 && (
          <div><dt className="text-muted-foreground">Reservation amount</dt><dd>{formatPhp(order.reservation_due_minor)}</dd></div>
        )}
      </dl>
      {proofDue ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          Pay {formatPhp(amountDue)}{order.home_credit_downpayment_due_minor > 0 ? ' for your Home Credit downpayment' : ''} and submit proof within one hour of placing your order.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {order.status === 'awaiting_confirmation'
            ? 'Staff will review your order before confirming it and reserving stock.'
            : 'Open order details for the latest status and next steps.'}
        </p>
      )}
    </CustomerConfirmationCard>
  );
}
