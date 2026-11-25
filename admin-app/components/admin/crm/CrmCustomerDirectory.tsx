import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { CrmCustomer } from '@/types/crm';

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' });
const desktopColumns = 'xl:grid xl:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] xl:items-center xl:gap-4';

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join('').toUpperCase();
}

export function CrmCustomerDirectory({ customers }: { customers: CrmCustomer[] }) {
  return (
    <>
      <div aria-hidden="true" className={desktopColumns + ' hidden border-y bg-muted/50 px-5 py-2.5 text-xs font-semibold text-muted-foreground'}>
        <span>Customer</span>
        <span>Latest branch</span>
        <span>Last order or booking</span>
        <span>Open follow-ups</span>
        <span className="w-4" />
      </div>
      <ul aria-label="Customer results" className="divide-y border-t xl:border-t-0">
        {customers.map((customer) => {
          const hasActivity = Boolean(customer.recent_branch_name || customer.last_interaction_at);
          return (
            <li key={customer.id}>
              <Link href={'/admin/crm/' + customer.id}
                className={desktopColumns + ' grid min-h-11 min-w-0 gap-2 px-4 py-3.5 transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-5'}>
                <div className="flex min-w-0 items-center gap-3">
                  <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(customer.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold">{customer.full_name}</p>
                    <p className="mt-0.5 break-words text-sm text-muted-foreground">{customer.email}</p>
                    {customer.phone_number && <p className="break-words text-sm text-muted-foreground">{customer.phone_number}</p>}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground xl:hidden" aria-hidden="true" />
                </div>

                <dl className={hasActivity ? 'ml-13 flex flex-wrap gap-x-4 gap-y-1 text-sm xl:contents' : 'ml-13 hidden text-sm xl:contents'}>
                  <div className={customer.recent_branch_name ? 'min-w-0' : 'hidden xl:block'}>
                    <dt className="text-xs text-muted-foreground xl:sr-only">Latest branch</dt>
                    <dd className="break-words">{customer.recent_branch_name ?? <><span aria-hidden="true" className="text-muted-foreground">&mdash;</span><span className="sr-only">None</span></>}</dd>
                  </div>
                  <div className={customer.last_interaction_at ? 'min-w-0' : 'hidden xl:block'}>
                    <dt className="text-xs text-muted-foreground xl:sr-only">Last order or booking</dt>
                    <dd>{customer.last_interaction_at ? (
                      <time dateTime={customer.last_interaction_at}>{dateFormat.format(new Date(customer.last_interaction_at))}</time>
                    ) : <><span aria-hidden="true" className="text-muted-foreground">&mdash;</span><span className="sr-only">None</span></>}</dd>
                  </div>
                </dl>

                {customer.open_follow_ups > 0 ? (
                  <span className="ml-13 w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary xl:ml-0">
                    {customer.open_follow_ups} open
                    <span className="xl:sr-only"> {customer.open_follow_ups === 1 ? 'follow-up' : 'follow-ups'}</span>
                  </span>
                ) : <span className="hidden text-sm text-muted-foreground xl:inline"><span aria-hidden="true">&mdash;</span><span className="sr-only">No open follow-ups</span></span>}

                <ChevronRight className="hidden size-4 text-muted-foreground xl:block" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
