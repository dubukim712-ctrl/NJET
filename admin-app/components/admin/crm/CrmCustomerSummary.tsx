import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import type { CrmCustomer } from '@/types/crm';

export function CrmCustomerSummary({ customer }: { customer: CrmCustomer }) {
  return (
    <section aria-labelledby="customer-name" className="space-y-5 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Customer support</p>
          <h1 id="customer-name" className="mt-2 break-words text-3xl font-semibold tracking-tight">{customer.full_name}</h1>
          {customer.recent_branch_name && (
            <p className="mt-1 flex items-center gap-2 break-words text-sm text-muted-foreground">
              <Building2 className="size-4 shrink-0" aria-hidden="true" /> Latest branch: {customer.recent_branch_name}
            </p>
          )}
        </div>
        {customer.open_follow_ups > 0 && (
          <a href="#customer-follow-ups" className="inline-flex min-h-11 items-center rounded-full bg-primary/10 px-3 text-sm font-semibold text-primary underline-offset-4 hover:underline">
            {customer.open_follow_ups} open {customer.open_follow_ups === 1 ? 'follow-up' : 'follow-ups'}
          </a>
        )}
      </div>
      <dl className="grid gap-4 border-t pt-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0">
          <dt className="flex items-center gap-2 text-muted-foreground"><Mail className="size-4" aria-hidden="true" /> Email</dt>
          <dd><a href={'mailto:' + customer.email} className="inline-flex min-h-11 items-center break-all text-primary underline underline-offset-4">{customer.email}</a></dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4" aria-hidden="true" /> Mobile number</dt>
          {customer.phone_number ? (
            <dd className="flex flex-wrap items-center gap-2">
              <a href={'tel:' + customer.phone_number} className="inline-flex min-h-11 items-center break-all text-primary underline underline-offset-4">{customer.phone_number}</a>
              <span className={'rounded-full px-2 py-1 text-xs font-medium ' + (customer.phone_verified_at ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground')}>
                {customer.phone_verified_at ? 'Verified' : 'Unverified'}
              </span>
            </dd>
          ) : <dd className="mt-2">Not saved</dd>}
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" aria-hidden="true" /> Saved address</dt>
          <dd className="mt-2 break-words">{customer.address || 'Not saved'}</dd>
        </div>
      </dl>
    </section>
  );
}
