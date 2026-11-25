'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { buildCrmCustomersHref, buildCrmFollowUpsHref, type CrmQueueFilters } from '@/lib/crm-view';
import type { CrmDueFilter } from '@/types/crm';

type Selection = Omit<CrmQueueFilters, 'page'>;
type Props = { mode: 'customers'; search: string; page: number } | { mode: 'follow-ups'; filters: CrmQueueFilters };

const searchDelay = 300;
const selectLayout = 'grid gap-1.5 [&>*]:m-0';
const dueOptions: { value: CrmDueFilter; label: string }[] = [
  { value: 'any', label: 'Any due date' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'upcoming', label: 'Upcoming' },
];

export function CrmFilters(props: Props) {
  const { mode } = props;
  const isQueue = mode === 'follow-ups';
  const applied = isQueue ? props.filters : {
    status: 'open' as const, mine: false, due: 'any' as const, search: props.search, page: props.page,
  };
  const { search, status, mine, due, page } = applied;
  const [draft, setDraft] = useState<Selection>(applied);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
  }, []);

  useEffect(() => {
    if (isPending || searchTimer.current !== null) return;
    const timer = window.setTimeout(() => {
      if (searchTimer.current === null) setDraft({ search, status, mine, due });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [search, status, mine, due, page, isPending]);

  function href(selection: Selection, nextPage = 1) {
    return isQueue ? buildCrmFollowUpsHref(selection, nextPage) : buildCrmCustomersHref(selection.search, nextPage);
  }

  function apply(next: Selection) {
    if (searchTimer.current !== null) {
      window.clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    const nextHref = href(next);
    if (!isPending && nextHref === href(applied, page)) return;
    startTransition(() => router.replace(nextHref, { scroll: false }));
  }

  function change(next: Selection) {
    setDraft(next);
    apply(next);
  }

  function changeSearch(value: string) {
    const next = { ...draft, search: value };
    setDraft(next);
    if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => apply(next), searchDelay);
  }

  const showDue = isQueue && draft.status === 'open';
  const hasFilters = Boolean(draft.search || draft.mine || draft.due !== 'any');
  const columns = showDue
    ? 'sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'
    : isQueue ? 'sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]' : 'sm:grid-cols-[minmax(0,1fr)_auto]';

  return (
    <div className="space-y-3">
      {isQueue && (
        <div role="group" aria-label="Follow-up status" className="flex flex-wrap gap-2">
          {(['open', 'completed'] as const).map((view) => (
            <Button key={view} type="button" variant={draft.status === view ? 'default' : 'outline'}
              aria-pressed={draft.status === view} className="min-h-11 rounded-full capitalize"
              onClick={() => {
                if (view !== draft.status) change({ ...draft, status: view, due: 'any' });
              }}>
              {view}
            </Button>
          ))}
        </div>
      )}
      <form role="search" aria-label={isQueue ? 'Filter follow-ups' : 'Customer directory'}
        onSubmit={(event) => { event.preventDefault(); apply(draft); }}
        className={'grid items-end gap-3 ' + columns}>
        <Input type="search" label={isQueue ? 'Search follow-ups' : 'Search customers'} value={draft.search} className="h-11"
          maxLength={100} onChange={(event) => changeSearch(event.currentTarget.value)}
          placeholder={isQueue ? 'Customer, branch, or next action' : 'Name, email, phone, order or serial number'}
          leadingIcon={<Search className="size-4" />} />
        {isQueue && (
          <Select label="Assigned to" value={draft.mine ? 'mine' : 'all'} className="h-11" containerClassName={selectLayout}
            onValueChange={(value) => change({ ...draft, mine: value === 'mine' })}>
            <option value="all">Everyone</option>
            <option value="mine">Me</option>
          </Select>
        )}
        {showDue && (
          <Select label="Due date" value={draft.due} className="h-11" containerClassName={selectLayout} onValueChange={(value) => {
            const matching = dueOptions.find((option) => option.value === value);
            if (matching) change({ ...draft, due: matching.value });
          }}>
            {dueOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </Select>
        )}
        {hasFilters && (
          <Button type="button" variant="outline" className="h-11"
            onClick={() => change({ ...draft, search: '', mine: false, due: 'any' })}>
            Clear filters
          </Button>
        )}
      </form>
      <p role="status" className={isPending ? 'text-sm text-muted-foreground' : 'sr-only'}>
        {isPending ? 'Updating results...' : ''}
      </p>
    </div>
  );
}
