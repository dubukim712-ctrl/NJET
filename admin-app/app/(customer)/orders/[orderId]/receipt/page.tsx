import { notFound } from 'next/navigation';
import { CustomerReceiptQuery } from '@/components/dashboard/CustomerReceiptQuery';
import { customerOrderIdSchema } from '@/lib/validations/commerce';

export const metadata = { title: 'Sales Receipt' };

export default async function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!customerOrderIdSchema.safeParse(orderId).success) notFound();
  return <CustomerReceiptQuery orderId={orderId} />;
}
