import { notFound } from 'next/navigation';
import { requireCustomer } from '@/data/auth/guards';
import { CustomerOrderPaymentQuery } from '@/components/checkout/CustomerOrderPaymentQuery';
import { customerOrderIdSchema } from '@/lib/validations/commerce';

export const metadata = { title: 'Order payment' };

export default async function OrderPaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  if (!customerOrderIdSchema.safeParse(orderId).success) {
    notFound();
  }
  const { user } = await requireCustomer(`/dashboard/orders/${orderId}`);

  return (
    <div className="mx-auto max-w-3xl">
      <CustomerOrderPaymentQuery
        userId={user.id}
        orderId={orderId}
        serverNow={new Date().toISOString()}
      />
    </div>
  );
}
