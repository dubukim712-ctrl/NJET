import { notFound } from 'next/navigation';
import { PrintableSalesReceipt } from '@/components/commerce/PrintableSalesReceipt';
import { requireCustomer } from '@/data/auth/guards';
import { getPrintableReceipt } from '@/data/commerce/printable-receipt';
import { customerOrderIdSchema } from '@/lib/validations/commerce';

export const metadata = { title: 'Sales Receipt' };

export default async function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!customerOrderIdSchema.safeParse(orderId).success) notFound();
  const backHref = `/dashboard/orders/${orderId}`;
  const { supabase, user } = await requireCustomer(`${backHref}/receipt`);
  const result = await getPrintableReceipt(supabase, orderId, { customerId: user.id });
  if (!result) notFound();
  return <PrintableSalesReceipt {...result} backHref={backHref} />;
}
