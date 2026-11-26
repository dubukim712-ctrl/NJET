import { redirect } from 'next/navigation';
import { CustomerReleaseManager } from '@/components/admin/settings/CustomerReleaseManager';
import { getManageableReleases, getReleaseOrderOptions, getReleaseStaffContext, releaseOrderReferences } from '@/data/commerce/customer-releases';

export const metadata = { title: 'Customer Releases' };

export default async function CustomerReleasesPage() {
  const context = await getReleaseStaffContext();
  if (!context) redirect('/no-access');

  const [releases, orders] = await Promise.allSettled([
    getManageableReleases(context.supabase, context.canApprove, context.user.id),
    getReleaseOrderOptions(context.supabase),
  ]);
  if (releases.status === 'rejected') {
    return <p role="alert" className="rounded-xl border bg-card p-4">Customer releases are temporarily unavailable.</p>;
  }

  const options = orders.status === 'fulfilled' ? orders.value : [];
  const orderNumbers = await releaseOrderReferences(context.supabase, [...new Set(releases.value.flatMap(
    ({ order_id }) => order_id ? [order_id] : [],
  ))]).catch(() => ({}));
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight">Customer Releases</h1>
      {orders.status === 'rejected' && <p role="alert" className="text-sm text-muted-foreground">Completed orders are temporarily unavailable. You can still submit a standalone photo.</p>}
      <CustomerReleaseManager items={releases.value} orders={options} orderNumbers={orderNumbers}
        userId={context.user.id} canApprove={context.canApprove} />
    </div>
  );
}
