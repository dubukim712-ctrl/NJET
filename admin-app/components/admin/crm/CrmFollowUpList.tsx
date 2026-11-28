import { SmartLink } from "@/components/ui/SmartLink";
import { CalendarDays, UserRound } from 'lucide-react';
import { CrmFollowUpStatusButton } from './CrmWriteForms';
import { getCrmDueState, getCrmToday } from '@/lib/crm-view';
import type { CrmFollowUp } from '@/types/crm';

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'UTC' });
const dueStyles = {
  Overdue: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200',
  'Due today': 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  Upcoming: 'bg-secondary text-secondary-foreground',
  Completed: 'bg-primary/10 text-primary',
};

export function CrmFollowUpList({ entries, canManage, showCustomer = false, embedded = false,
  emptyMessage = 'No open follow-ups for this customer.',
}: {
  entries: CrmFollowUp[];
  canManage: boolean;
  showCustomer?: boolean;
  embedded?: boolean;
  emptyMessage?: string;
}) {
  const frame = embedded ? 'border-t' : 'rounded-xl border bg-card';
  if (!entries.length) return <p className={frame + ' p-5 text-sm text-muted-foreground'}>{emptyMessage}</p>;
  const today = getCrmToday();

  return (
    <ul aria-label="Follow-ups" className={frame + ' divide-y'}>
      {entries.map((entry) => {
        const dueState = getCrmDueState(entry.due_on, entry.status, today);
        return (
          <li key={entry.id} className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:justify-between sm:p-5">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={'rounded-full px-2.5 py-1 text-xs font-semibold ' + dueStyles[dueState]}>{dueState}</span>
                {showCustomer && (
                  <SmartLink href={'/admin/crm/' + entry.customer_id} className="inline-flex min-h-11 items-center break-words text-sm font-medium text-primary underline underline-offset-4">
                    {entry.customer_name}
                  </SmartLink>
                )}
              </div>
              <p className="break-words font-semibold">{entry.next_action}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <p className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  <span>Due <time dateTime={entry.due_on}>{dateFormat.format(new Date(entry.due_on + 'T00:00:00Z'))}</time></span>
                </p>
                <p className="inline-flex min-w-0 items-center gap-1.5">
                  <UserRound className="size-4 shrink-0" aria-hidden="true" />
                  <span className="break-words">{entry.assignee_name} / {entry.branch_name}</span>
                </p>
              </div>
            </div>
            {canManage && <CrmFollowUpStatusButton followUp={entry} />}
          </li>
        );
      })}
    </ul>
  );
}
