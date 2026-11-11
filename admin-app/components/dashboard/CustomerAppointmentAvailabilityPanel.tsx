'use client';

import { CalendarClock, CircleCheck, CircleX, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ServiceAppointmentsQueryError } from '@/data/appointments/client';
import { useCustomerServiceAppointmentAvailabilityQuery } from '@/data/appointments/availability-client';

export function CustomerAppointmentAvailabilityPanel({
  userId,
  branchId,
  branchName,
  slotStart,
}: {
  userId: string;
  branchId: string;
  branchName: string;
  slotStart: string;
}) {
  const query = useCustomerServiceAppointmentAvailabilityQuery(userId, branchId, slotStart);

  return (
    <aside className="space-y-4 rounded-xl border bg-card p-5 lg:sticky lg:top-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Workshop availability
        </p>
        <h2 className="mt-1 text-lg font-semibold">Your selected slot</h2>
      </header>

      <div className="space-y-2 border-y py-3 text-sm">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{(query.data?.branchName ?? branchName) || 'Choose a service branch'}</span>
        </p>
        <p className="flex items-start gap-2 text-muted-foreground">
          <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {slotStart
              ? new Date(slotStart).toLocaleString('en-PH', {
                  timeZone: 'Asia/Manila',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Choose a date and time'}
          </span>
        </p>
      </div>

      {query.isError && query.data && (
        <p className="text-xs text-destructive" role="alert">
          Availability could not refresh. Showing the last loaded status.
        </p>
      )}
      {!branchId || !slotStart ? (
        <p className="text-sm leading-6 text-muted-foreground">
          Select a branch, date, and 30-minute slot to see technician availability.
        </p>
      ) : query.isPending ? (
        <div className="space-y-2" role="status" aria-label="Checking technician availability">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <p className="text-xs text-muted-foreground">Checking live availability…</p>
        </div>
      ) : !query.data ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive" role="alert">
            {query.error instanceof ServiceAppointmentsQueryError
              ? query.error.message
              : 'Technician availability could not be loaded.'}
          </p>
          <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
            Try again
          </Button>
        </div>
      ) : !query.data.hoursConfigured ? (
        <p className="rounded-lg border border-amber-700/30 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          This branch has no saved weekly service hours yet. Staff will confirm the schedule.
        </p>
      ) : query.data.closureActive ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          The branch is blocked for this time. Choose another slot or send a request for staff confirmation.
        </p>
      ) : !query.data.branchOpen ? (
        <p className="rounded-lg border border-amber-700/30 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          The branch is outside its service hours for this slot.
        </p>
      ) : query.data.technicians.length === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          No technicians with customer-facing names are assigned to this branch.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4 text-primary" aria-hidden="true" />
            Technician status
          </p>
          <ul className="space-y-2">
            {query.data.technicians.map((technician) => (
              <li key={technician.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 break-words">{technician.name}</span>
                <span className={`flex shrink-0 items-center gap-1.5 font-medium ${
                  technician.available ? 'text-emerald-800' : 'text-muted-foreground'
                }`}>
                  {technician.available
                    ? <CircleCheck className="size-4" aria-hidden="true" />
                    : <CircleX className="size-4" aria-hidden="true" />}
                  {technician.available ? 'Available' : 'Booked'}
                </span>
              </li>
            ))}
          </ul>
          {!query.data.technicians.some((technician) => technician.available) && (
            <p className="text-xs leading-5 text-muted-foreground">
              No technician is available in this 30-minute slot.
            </p>
          )}
        </div>
      )}

      <p className="text-xs leading-5 text-muted-foreground">
        Availability refreshes automatically. Your appointment remains a request until staff confirms it.
      </p>
    </aside>
  );
}
