import { notFound } from 'next/navigation';
import { CustomerOrderDetailQuery } from '@/components/dashboard/CustomerOrderDetailQuery';
import { SmartLink } from '@/components/ui/SmartLink';
import { customerOrderIdSchema } from '@/lib/validations/commerce';

export const metadata = { title: 'Order details' };

export default async function OrderDetailsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!customerOrderIdSchema.safeParse(orderId).success) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <SmartLink href="/orders" prefetch={true} className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
          Back to orders
        </SmartLink>
        <h1 className="text-3xl font-semibold tracking-tight">Order details</h1>
      </header>
      <CustomerOrderDetailQuery orderId={orderId} />
    </div>
  );
}
