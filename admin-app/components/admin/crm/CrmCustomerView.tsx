'use client';

import { useCrmCustomer } from '@/data/crm/client';
import { useParams } from 'next/navigation';
import type { UserProfile } from '@/types/database';
import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CrmCustomerActivity } from '@/components/admin/crm/CrmCustomerActivity';
import { CrmFollowUpList } from '@/components/admin/crm/CrmFollowUpList';
import { CrmCustomerSummary } from '@/components/admin/crm/CrmCustomerSummary';
import { CrmProfileActions } from '@/components/admin/crm/CrmProfileActions';

function Content({ profile }: { profile: UserProfile }) {
  const { customerId } = useParams<{ customerId: string }>();
  const canManage = hasPermission(profile, PERMISSIONS.crmManage);
  const { query, preview } = useCrmCustomer(profile, customerId);
  const data = query.data;
  const customer = data?.customer ?? preview;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" className="min-h-11 gap-2">
        <Link prefetch={true} href="/admin/crm"><ArrowLeft className="size-4" aria-hidden="true" /> Back to customers</Link>
      </Button>
      {customer && <CrmCustomerSummary customer={customer} />}
      {query.isPending && <p role="status" className="text-sm text-muted-foreground">Loading customer activity…</p>}
      {query.isError && <p role="alert" className="text-sm text-destructive">Customer profile could not be loaded.</p>}
      {data && !customer && <p>This customer is unavailable.</p>}
      {customer && data?.customer && (
        <>
          {data.error && <p role="alert" className="rounded-xl border p-4 text-sm text-destructive">Some customer information could not be loaded.</p>}
          {canManage && <CrmProfileActions customerId={customerId} staff={data.staff ?? []} />}
          <section id="customer-follow-ups" aria-labelledby="follow-up-heading" className="scroll-mt-24 space-y-2">
            <h2 id="follow-up-heading" className="text-lg font-semibold">Open follow-ups</h2>
            <CrmFollowUpList entries={data.followUps ?? []} canManage={canManage} />
          </section>
          <CrmCustomerActivity activity={data.activity ?? []} notes={data.notes ?? []} />
        </>
      )}
    </div>
  );
}

export function CrmCustomerView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !hasPermission(profile, PERMISSIONS.crmRead)) return null;
  return <Content profile={profile} />;
}
