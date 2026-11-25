import { CrmHeader } from '@/components/admin/crm/CrmHeader';
import { CrmFollowUpList } from '@/components/admin/crm/CrmFollowUpList';
import { CrmPagination } from '@/components/admin/crm/CrmPagination';
import { CrmFilters } from '@/components/admin/crm/CrmFilters';
import { requirePermission } from '@/data/auth/guards';
import { getCrmFollowUpPage } from '@/data/crm/queries';
import { buildCrmFollowUpsHref, CRM_PAGE_SIZE, getCrmQueueFilters, type CrmSearchParams } from '@/lib/crm-view';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'CRM follow-ups' };

export default async function CrmFollowUpsPage({ searchParams }: { searchParams: Promise<CrmSearchParams> }) {
  const { supabase, profile } = await requirePermission(PERMISSIONS.crmRead, '/admin/crm/follow-ups');
  const filters = getCrmQueueFilters(await searchParams);
  const { status, mine, due, search, page } = filters;
  const result = await getCrmFollowUpPage(supabase, { ...filters, offset: (page - 1) * CRM_PAGE_SIZE });
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
        {result.error ? (
          <p role="alert" className="border-t p-4 text-sm text-destructive">Follow-ups could not be loaded. Please try again.</p>
        ) : (
          <>
            <CrmFollowUpList entries={entries} canManage={hasPermission(profile, PERMISSIONS.crmManage)}
              showCustomer embedded emptyMessage={hasFilters ? 'No follow-ups match these filters.' : status === 'open' ? 'No open follow-ups.' : 'No completed follow-ups.'} />
            <CrmPagination page={page} hasNext={hasNext} href={(next) => buildCrmFollowUpsHref(filters, next)} label="Follow-up pages" />
          </>
        )}
      </section>
    </div>
  );
}
