import { notFound } from 'next/navigation';
import { AdminReceiptView } from '@/components/admin/commerce/AdminReceiptView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import { customerOrderIdSchema } from '@/lib/validations/commerce';

export const metadata = { title: 'Sales Receipt' };

export default async function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!customerOrderIdSchema.safeParse(orderId).success) notFound();
  const { profile } = await requirePermission(PERMISSIONS.ordersRead, '/admin/orders/' + orderId + '/receipt');
  if (profile.scope === 'staff' && !profile.is_full_access && !profile.branch_id) notFound();
  return <AdminReceiptView />;
}
