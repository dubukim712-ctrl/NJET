import { notFound } from 'next/navigation';
import { PrintableSalesReceipt } from '@/components/commerce/PrintableSalesReceipt';
import { requirePermission } from '@/data/auth/guards';
import { getPrintableReceipt } from '@/data/commerce/printable-receipt';
import { PERMISSIONS } from '@/lib/permissions';
import { customerOrderIdSchema } from '@/lib/validations/commerce';

export const metadata = { title: 'Sales Receipt' };

export default async function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!customerOrderIdSchema.safeParse(orderId).success) notFound();
  const { supabase, profile } = await requirePermission(PERMISSIONS.ordersRead, `/admin/orders/${orderId}/receipt`);
  const branchLocked = profile.scope === 'staff' && !profile.is_full_access;
  if (branchLocked && !profile.branch_id) notFound();
  const result = await getPrintableReceipt(supabase, orderId, { branchId: branchLocked ? profile.branch_id : null });
  if (!result) notFound();
  return <PrintableSalesReceipt {...result} backHref={`/admin/orders?view=completed&q=${encodeURIComponent(result.receipt.orderNumber)}`} />;
}
