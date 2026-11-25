'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bike, MessageSquareText, NotebookPen, ShoppingBag, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { buildOrdersHref } from '@/lib/commerce';
import type { CrmActivity, CrmNote } from '@/types/crm';

const dateTime = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila',
});

function activityHref(entry: CrmActivity) {
  if (entry.kind === 'Order') return buildOrdersHref({ search: entry.reference, view: 'all' });
  if (entry.kind === 'Service') return '/admin/appointments?' + new URLSearchParams({ q: entry.reference });
  return '/admin/chats';
}

const activityFilters = [
  { id: 'All', label: 'All activity' },
  { id: 'Order', label: 'Orders' },
  { id: 'Service', label: 'Service' },
  { id: 'Chat', label: 'Chats' },
  { id: 'Note', label: 'Notes' },
] as const;
const activityIcons = { Order: ShoppingBag, Service: Wrench, Chat: MessageSquareText, Note: NotebookPen };
type ActivityFilter = (typeof activityFilters)[number]['id'];

export function CrmCustomerActivity({ activity, notes }: { activity: CrmActivity[]; notes: CrmNote[] }) {
  const [filter, setFilter] = useState<ActivityFilter>('All');
  const timeline = [
    ...activity.map((entry) => ({ timestamp: entry.occurred_at, entry } as const)),
    ...notes.map((note) => ({ timestamp: note.created_at, note } as const)),
  ].filter((item) => filter === 'All' || ('note' in item ? filter === 'Note' : item.entry.kind === filter))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  const bikes = activity.flatMap((entry) => (entry.bikes ?? []).map((bike) => ({ bike, entry })));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <div role="group" aria-label="Filter customer activity" className="flex flex-wrap gap-2">
          {activityFilters.map(({ id, label }) => (
            <Button key={id} type="button" variant={filter === id ? 'secondary' : 'ghost'}
              aria-pressed={filter === id} className="min-h-11" onClick={() => setFilter(id)}>
              {label}
            </Button>
          ))}
        </div>
        {timeline.length ? (
          <ol className="divide-y">
            {timeline.map((item) => {
              const Icon = activityIcons['note' in item ? 'Note' : item.entry.kind];
              return (
                <li key={'note' in item ? 'note-' + item.note.id : item.entry.kind + '-' + item.entry.id} className="flex gap-3 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    {'note' in item ? (
                      <>
                        <p className="text-sm font-medium">Internal note / {item.note.author} / {item.note.branch_name}</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.note.body}</p>
                      </>
                    ) : (
                      <>
                        <Link href={activityHref(item.entry)} className="inline-flex min-h-11 items-center text-sm font-medium underline">
                          {item.entry.reference}
                        </Link>
                        <p className="break-words text-sm capitalize">{[item.entry.kind, item.entry.detail, item.entry.status.replaceAll('_', ' ')].filter(Boolean).join(' / ')}</p>
                      </>
                    )}
                    <time className="mt-1 block text-xs text-muted-foreground" dateTime={item.timestamp}>
                      {dateTime.format(new Date(item.timestamp))} (Philippine time)
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          {filter === 'All' ? 'No linked activity yet.' : 'No recent activity in this category.'}
        </p>}
      </section>
      <section className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Bike className="size-5 shrink-0" aria-hidden="true" /> Bikes in recent purchases</h2>
        {bikes.length ? (
          <ul className="divide-y">
            {bikes.map(({ bike, entry }, index) => (
              <li key={entry.id + ':' + index} className="break-words py-3 text-sm">
                <p className="font-medium">{bike.name} / {bike.variant}</p>
                {bike.serial && <p className="text-muted-foreground">Serial number {bike.serial}</p>}
                <Link className="inline-flex min-h-11 items-center underline" href={activityHref(entry)}>{entry.reference}</Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No bikes in the recent completed orders you can access.</p>}
      </section>
    </div>
  );
}
