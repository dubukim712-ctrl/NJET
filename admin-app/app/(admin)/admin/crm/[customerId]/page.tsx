import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { CrmCustomerActivity } from '@/components/admin/crm/CrmCustomerActivity';
import { CrmFollowUpList } from '@/components/admin/crm/CrmFollowUpList';
import { CrmCustomerSummary } from '@/components/admin/crm/CrmCustomerSummary';
import { CrmProfileActions } from '@/components/admin/crm/CrmProfileActions';
import { requirePermission } from '@/data/auth/guards';
import { getCrmProfile } from '@/data/crm/queries';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Customer profile' };

export default async function CrmCustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  if (!z.uuid().safeParse(customerId).success) notFound();
  const { supabase, profile } = await requirePermission(PERMISSIONS.crmRead, '/admin/crm/' + customerId);
  const canManage = hasPermission(profile, PERMISSIONS.crmManage);
  const data = await getCrmProfile(supabase, customerId, canManage);
  if (!data.customer && !data.error) notFound();
  if (!data.customer) return <p role="alert" className="rounded-xl border p-4 text-destructive">Customer profile could not be loaded.</p>;
  const customer = data.customer;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" className="min-h-11 gap-2">
        <Link href="/admin/crm"><ArrowLeft className="size-4" aria-hidden="true" /> Back to customers</Link>
      </Button>
      <CrmCustomerSummary customer={customer} />
      {data.error && <p role="alert" className="rounded-xl border p-4 text-sm text-destructive">Some customer information could not be loaded.</p>}
      {canManage && <CrmProfileActions customerId={customerId} staff={data.staff ?? []} />}
      <section id="customer-follow-ups" aria-labelledby="follow-up-heading" className="scroll-mt-24 space-y-2">
        <h2 id="follow-up-heading" className="text-lg font-semibold">Open follow-ups</h2>
        <CrmFollowUpList entries={data.followUps ?? []} canManage={canManage} />
      </section>
      <CrmCustomerActivity activity={data.activity ?? []} notes={data.notes ?? []} />
    </div>
  );
}
