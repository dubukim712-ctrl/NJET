'use client';

import { useCrmCustomers } from '@/data/crm/client';
import { useSearchParams } from 'next/navigation';
import type { UserProfile } from '@/types/database';
import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { UsersRound } from 'lucide-react';
import { CrmCustomerDirectory } from '@/components/admin/crm/CrmCustomerDirectory';
import { CrmHeader } from '@/components/admin/crm/CrmHeader';
import { CrmPagination } from '@/components/admin/crm/CrmPagination';
import { CrmFilters } from '@/components/admin/crm/CrmFilters';
import { buildCrmCustomersHref, CRM_PAGE_SIZE, getCrmPage } from '@/lib/crm-view';

function Content({ profile }: { profile: UserProfile }) {
  const params = useSearchParams();
  const search = params.get('q')?.trim().slice(0, 100) ?? '';
  const page = getCrmPage(params.get('page') ?? undefined);
  const result = useCrmCustomers(profile, search, page);
  const customers = result.data?.slice(0, CRM_PAGE_SIZE) ?? [];

  const hasNextPage = (result.data?.length ?? 0) > CRM_PAGE_SIZE;
  const firstResult = (page - 1) * CRM_PAGE_SIZE + 1;

  return (
    <div className="space-y-5">
      <CrmHeader current="customers" title="Customer CRM" description="Find customer records and manage follow-ups." />

      <section aria-labelledby="customer-directory-title" className="rounded-xl border bg-card">
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="customer-directory-title" className="text-lg font-semibold">Customer directory</h2>
            {!result.isPlaceholderData && customers.length > 0 && (
              <p className="text-sm tabular-nums text-muted-foreground">
                Showing {firstResult}{customers.length > 1 ? ' to ' + (firstResult + customers.length - 1) : ''}
              </p>
            )}
          </div>
          <CrmFilters mode="customers" search={search} page={page} />
        </div>

        {result.isPlaceholderData && <p className="border-t p-4 text-sm text-muted-foreground" role="status">Updating results…</p>}
        {result.isRefetchError && <p className="border-t p-4 text-sm text-muted-foreground" role="status">Could not refresh. Showing the last loaded results.</p>}
        {result.error && !result.data ? (
          <p role="alert" className="border-t p-4 text-sm text-destructive">Customers could not be loaded. Please try again.</p>
        ) : result.isPending ? (
          <p role="status" className="border-t p-4">Loading customers…</p>
        ) : customers.length ? (
          <CrmCustomerDirectory customers={customers} />
        ) : !result.isPlaceholderData && (
          <div className="space-y-2 border-t px-4 py-10 text-center">
            <UsersRound className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">{search ? 'No matching customers' : 'No customers on this page'}</p>
            {search && <p className="text-sm text-muted-foreground">Try a different name, contact detail, order number, or serial number.</p>}
          </div>
        )}

        {result.data && !result.isPlaceholderData && <CrmPagination page={page} hasNext={hasNextPage} href={(next) => buildCrmCustomersHref(search, next)} label="Customer pages" />}
      </section>
    </div>
  );
}

export function CrmDirectoryView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !hasPermission(profile, PERMISSIONS.crmRead)) return null;
  return <Content profile={profile} />;
}
