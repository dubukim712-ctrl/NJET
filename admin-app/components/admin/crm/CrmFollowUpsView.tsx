'use client';

import { useCrmFollowUps } from '@/data/crm/client';
import { useSearchParams } from 'next/navigation';
import type { UserProfile } from '@/types/database';
import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { CrmHeader } from '@/components/admin/crm/CrmHeader';
import { CrmFollowUpList } from '@/components/admin/crm/CrmFollowUpList';
import { CrmPagination } from '@/components/admin/crm/CrmPagination';
import { CrmFilters } from '@/components/admin/crm/CrmFilters';
import { buildCrmFollowUpsHref, CRM_PAGE_SIZE, getCrmQueueFilters } from '@/lib/crm-view';

function Content({ profile }: { profile: UserProfile }) {
  const filters = getCrmQueueFilters(Object.fromEntries(useSearchParams().entries()));
  const { status, mine, due, search, page } = filters;
  const result = useCrmFollowUps(profile, filters);
  const entries = result.data?.slice(0, CRM_PAGE_SIZE) ?? [];
  const hasNext = (result.data?.length ?? 0) > CRM_PAGE_SIZE;
  const hasFilters = Boolean(mine || due !== 'any' || search);

  return (
    <div className="space-y-5">
      <CrmHeader current="follow-ups" title="Follow-ups" description="Review due dates and pick up work assigned to you." />
      <section aria-label="Follow-up queue" className="rounded-xl border bg-card">
        <div className="space-y-4 p-4 sm:p-5">
          <CrmFilters mode="follow-ups" filters={filters} />
        </div>
        {result.isPlaceholderData && <p className="border-t p-4 text-sm text-muted-foreground" role="status">Updating results…</p>}
        {result.isRefetchError && <p className="border-t p-4 text-sm text-muted-foreground" role="status">Could not refresh. Showing the last loaded results.</p>}
        {result.error && !result.data ? (
          <p role="alert" className="border-t p-4 text-sm text-destructive">Follow-ups could not be loaded. Please try again.</p>
        ) : result.isPending ? (
          <p role="status" className="border-t p-4">Loading follow-ups…</p>
        ) : (
          <>
            {(!result.isPlaceholderData || entries.length > 0) && <CrmFollowUpList entries={entries} canManage={!result.isPlaceholderData && hasPermission(profile, PERMISSIONS.crmManage)}
              showCustomer embedded emptyMessage={hasFilters ? 'No follow-ups match these filters.' : status === 'open' ? 'No open follow-ups.' : 'No completed follow-ups.'} />}
            {!result.isPlaceholderData && <CrmPagination page={page} hasNext={hasNext} href={(next) => buildCrmFollowUpsHref(filters, next)} label="Follow-up pages" />}
          </>
        )}
      </section>
    </div>
  );
}

export function CrmFollowUpsView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !hasPermission(profile, PERMISSIONS.crmRead)) return null;
  return <Content profile={profile} />;
}
