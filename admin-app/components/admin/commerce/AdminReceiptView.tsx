'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { PrintableSalesReceipt } from '@/components/commerce/PrintableSalesReceipt';
import { SmartLink } from '@/components/ui/SmartLink';
import { Button } from '@/components/ui/Button';
import { adminOrdersQueryKey } from '@/data/commerce/admin-orders-client';
import { getAdminOrderReceipt } from '@/data/actions/admin-order-receipt';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export function AdminReceiptView() {
  const { orderId } = useParams<{ orderId: string }>();
  const profile = useVerifiedAdminProfile();
  const allowed = Boolean(profile && hasPermission(profile, PERMISSIONS.ordersRead));
  const query = useQuery({
    queryKey: [...adminOrdersQueryKey, profile?.id, 'receipt', profile?.branch_id, profile?.is_full_access, orderId],
    queryFn: () => getAdminOrderReceipt(profile!.id, orderId),
    enabled: allowed,
    retry: false,
  });
  if (!allowed) return null;
  if (query.data) {
    const href = '/admin/orders?view=history&status=completed&q=' + encodeURIComponent(query.data.receipt.orderNumber);
    return <PrintableSalesReceipt {...query.data} backLink={<SmartLink className="text-sm font-medium underline" href={href} prefetch={true}>Back to Order</SmartLink>} />;
  }
  return (
    <div className="space-y-4">
      <SmartLink href="/admin/orders" prefetch={true} className="text-sm font-medium underline">Back to orders</SmartLink>
      <h1 className="text-3xl font-semibold tracking-tight">Sales Receipt</h1>
      {query.isPending && <p role="status">Loading receipt…</p>}
      {query.isSuccess && <p>This receipt is unavailable.</p>}
      {query.isError && <div role="alert" className="space-y-2">
        <p>The receipt could not be loaded.</p>
        <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>
      </div>}
    </div>
  );
}
