'use client';

import { AppointmentDateTimeFields } from '@/components/appointments/AppointmentDateTimeFields';
import { Button } from '@/components/ui/Button';
import type { CustomerServiceAppointmentSlots } from '@/data/actions/service-availability';
import { ServiceAppointmentsQueryError } from '@/data/appointments/client';

export function CustomerAppointmentDateTimeFields({
  branchId,
  date,
  time,
  slots,
  loading,
  error,
  onDateChange,
  onTimeChange,
  onRetry,
  dateError,
}: {
  branchId: string;
  date: string;
  time: string;
  slots?: CustomerServiceAppointmentSlots;
  loading: boolean;
  error: Error | null;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onRetry: () => void;
  dateError?: string;
}) {
  const closures = slots?.closures ?? [];
  const helperText = !branchId || !date
    ? 'Choose a branch and date to see service times.'
    : loading
      ? 'Loading times for this branch and weekday...'
      : error
        ? 'Service times could not be loaded.'
        : !slots?.hoursConfigured
          ? 'Service hours are not configured for this branch.'
          : !slots.branchOpen
            ? 'This branch is closed on the selected weekday.'
            : slots.times.length
              ? 'Choose a 30-minute slot; the last start is one hour before closing.'
              : 'No service slots remain on this date.';

  return (
    <>
      <AppointmentDateTimeFields
        date={date}
        time={time}
        onDateChange={onDateChange}
        onTimeChange={onTimeChange}
        dateLabel="Preferred date (Philippine time)"
        timeLabel="Preferred time"
        dateHelperText="Choose a future date; staff will confirm availability."
        timeHelperText={helperText}
        timeOptions={slots?.times ?? []}
        timeDisabled={
          !branchId || !date || loading || Boolean(error) || !slots?.times.length
        }
        dateError={dateError}
      />
      {branchId && date && closures.length > 0 && (
        <div
          className="space-y-1 rounded-lg border border-amber-700/30 bg-amber-50 p-3 text-sm text-amber-950 sm:col-span-2"
          role="status"
        >
          <p className="font-semibold">
            This branch is unavailable for appointments during:
          </p>
          <ul className="list-inside list-disc">
            {closures.map((closure) => (
              <li key={`${closure.startsAt}-${closure.endsAt}`}>
                {formatClosureRange(closure.startsAt, closure.endsAt)}
              </li>
            ))}
          </ul>
          <p>Choose an available time outside these closure periods.</p>
        </div>
      )}
      {branchId && date && error && (
        <div className="sm:col-span-2">
          <p className="text-sm text-destructive" role="alert">
            {error instanceof ServiceAppointmentsQueryError
              ? error.message
              : 'Service times could not be loaded.'}
          </p>
          <Button type="button" variant="outline" className="mt-2" onClick={onRetry}>
            Retry available times
          </Button>
        </div>
      )}
    </>
  );
}

function formatClosureRange(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return `${formatter.format(new Date(startsAt))} – ${formatter.format(new Date(endsAt))}`;
}
