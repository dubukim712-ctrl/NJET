'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  createServiceAppointmentClosureAction,
  deleteServiceAppointmentClosureAction,
} from '@/data/actions/service-appointment-closures';
import {
  ServiceAppointmentsQueryError,
  useInvalidateServiceAppointmentsQuery,
} from '@/data/appointments/client';
import {
  useServiceAppointmentClosuresQuery,
} from '@/data/appointments/closures-client';

type Branch = { id: string; name: string };

function todayInManila() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function displayClosureDate(value: string) {
  return new Date(value).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function AppointmentClosureCalendar({
  userId,
  branches,
}: {
  userId: string;
  branches: Branch[];
}) {
  const invalidateAppointments = useInvalidateServiceAppointmentsQuery();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [startsOn, setStartsOn] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const closuresQuery = useServiceAppointmentClosuresQuery(userId, branchId);
  const minDate = todayInManila();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await createServiceAppointmentClosureAction({
        branchId,
        startsAt: `${startsOn}T${startsAt}:00+08:00`,
        endsAt: `${endsOn}T${endsAt}:00+08:00`,
        reason,
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setStartsOn('');
      setStartsAt('');
      setEndsOn('');
      setEndsAt('');
      setReason('');
      await invalidateAppointments();
      toast.success('Branch closure added.');
    } catch (saveError) {
      console.error('Could not add branch closure.', saveError);
      setError('Branch closure could not be added. Please try again.');
      toast.error('Branch closure could not be added.');
    } finally {
      setBusy(false);
    }
  }

  async function removeClosure(id: string) {
    setBusy(true);
    setError('');
    try {
      const result = await deleteServiceAppointmentClosureAction(id);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      await invalidateAppointments();
      toast.success('Branch closure removed.');
    } catch (removeError) {
      console.error('Could not remove branch closure.', removeError);
      setError('Branch closure could not be removed. Please try again.');
      toast.error('Branch closure could not be removed.');
    } finally {
      setBusy(false);
    }
  }

  if (!branches.length) {
    return (
      <section className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        No service branches are available to manage closure times.
      </section>
    );
  }

  return (
    <details className="rounded-xl border bg-card p-5 sm:p-6">
      <summary className="cursor-pointer font-semibold">Manage branch closure times</summary>
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)]">
        <form className="space-y-4" onSubmit={submit}>
          <p className="text-sm leading-6 text-muted-foreground">
            Block 30-minute appointment slots for this branch. Existing confirmed appointments must be rescheduled first.
          </p>
          <Select
            label="Service branch"
            helperText="Closures only affect the selected branch."
            value={branchId}
            disabled={busy}
            onChange={(event) => setBranchId(event.currentTarget.value)}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <DatePicker
              label="Starts on"
              name="closureStartsOn"
              value={startsOn}
              onChange={setStartsOn}
              min={minDate}
              required
              disabled={busy}
              helperText="Start date in Philippine time."
            />
            <Input
              type="time"
              label="Starts at"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              step={1800}
              required
              disabled={busy}
              helperText="Choose a 30-minute boundary."
            />
            <DatePicker
              label="Ends on"
              name="closureEndsOn"
              value={endsOn}
              onChange={setEndsOn}
              min={minDate}
              required
              disabled={busy}
              helperText="End date in Philippine time."
            />
            <Input
              type="time"
              label="Ends at"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              step={1800}
              required
              disabled={busy}
              helperText="End time is exclusive."
            />
          </div>
          <Input
            label="Reason (optional)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={300}
            disabled={busy}
            helperText="Internal note for staff; customers only see that the slot is unavailable."
          />
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" loading={busy} disabled={busy || !branchId}>
            Add closure
          </Button>
        </form>

        <section aria-label="Upcoming branch closures" className="space-y-3">
          <h2 className="font-semibold">
            Upcoming closures
            {branchId && ` · ${branches.find((branch) => branch.id === branchId)?.name ?? ''}`}
          </h2>
          {closuresQuery.isPending && (
            <div className="h-24 animate-pulse rounded-lg border bg-muted" role="status" aria-label="Loading branch closures" />
          )}
          {!closuresQuery.data && closuresQuery.isError && (
            <div className="space-y-2">
              <p className="text-sm text-destructive" role="alert">
                {closuresQuery.error instanceof ServiceAppointmentsQueryError
                  ? closuresQuery.error.message
                  : 'Branch closures could not be loaded.'}
              </p>
              <Button type="button" variant="outline" onClick={() => { void closuresQuery.refetch(); }}>
                Retry
              </Button>
            </div>
          )}
          {closuresQuery.data?.length === 0 && (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              No upcoming closures for this branch.
            </p>
          )}
          {closuresQuery.data && closuresQuery.data.length > 0 && (
            <ul className="space-y-2">
              {closuresQuery.data.map((closure) => (
                <li key={closure.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{displayClosureDate(closure.starts_at)}</p>
                    <p className="text-sm text-muted-foreground">to {displayClosureDate(closure.ends_at)}</p>
                    {closure.reason && (
                      <p className="mt-1 break-words text-xs text-muted-foreground">{closure.reason}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => { void removeClosure(closure.id); }}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {closuresQuery.isError && closuresQuery.data && (
            <p className="text-xs text-destructive" role="alert">
              Could not refresh closures; the last loaded data is shown.
            </p>
          )}
        </section>
      </div>
    </details>
  );
}
