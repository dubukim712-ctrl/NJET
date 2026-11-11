'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { saveBranchServiceHoursAction } from '@/data/actions/service-availability';
import { useInvalidateAdminSystemSettingsQuery } from '@/data/commerce/admin-system-settings-client';

const DAYS = [
  { dayOfWeek: 0, name: 'Sunday' },
  { dayOfWeek: 1, name: 'Monday' },
  { dayOfWeek: 2, name: 'Tuesday' },
  { dayOfWeek: 3, name: 'Wednesday' },
  { dayOfWeek: 4, name: 'Thursday' },
  { dayOfWeek: 5, name: 'Friday' },
  { dayOfWeek: 6, name: 'Saturday' },
] as const;

type BranchHours = {
  branchId: string;
  dayOfWeek: number;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

type ScheduleDay = {
  dayOfWeek: number;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
};

function makeSchedule(branchId: string, savedHours: BranchHours[]): ScheduleDay[] {
  return DAYS.map(({ dayOfWeek }) => {
    const saved = savedHours.find(
      (hour) => hour.branchId === branchId && hour.dayOfWeek === dayOfWeek
    );
    return {
      dayOfWeek,
      isOpen: saved?.isOpen ?? false,
      opensAt: saved?.opensAt?.slice(0, 5) ?? '08:00',
      closesAt: saved?.closesAt?.slice(0, 5) ?? '18:00',
    };
  });
}

export function BranchServiceHoursSettings({
  branches,
  hours,
}: {
  branches: { id: string; name: string }[];
  hours: BranchHours[];
}) {
  const router = useRouter();
  const invalidateSettings = useInvalidateAdminSystemSettingsQuery();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [schedule, setSchedule] = useState(() => makeSchedule(branches[0]?.id ?? '', hours));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const configured = hours.some((hour) => hour.branchId === branchId);

  function changeBranch(nextBranchId: string) {
    setBranchId(nextBranchId);
    setSchedule(makeSchedule(nextBranchId, hours));
    setError('');
  }

  function updateDay(dayOfWeek: number, patch: Partial<ScheduleDay>) {
    setSchedule((current) =>
      current.map((day) => day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day)
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await saveBranchServiceHoursAction({ branchId, hours: schedule });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      await invalidateSettings();
      router.refresh();
      toast.success('Branch service hours saved.');
    } catch (saveError) {
      console.error('Could not save branch service hours.', saveError);
      setError('Branch service hours could not be saved. Please try again.');
      toast.error('Branch service hours could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  if (!branches.length) {
    return (
      <section className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        Add a branch before configuring service hours.
      </section>
    );
  }

  return (
    <section className="max-w-3xl space-y-5 rounded-xl border bg-card p-4 sm:p-6">
      <header>
        <h2 className="text-xl font-semibold">Branch service hours</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Set the weekly hours used for technician availability. Times use Philippine time.
        </p>
      </header>
      <Select
        label="Service branch"
        helperText="Configure one branch at a time."
        value={branchId}
        disabled={busy}
        onChange={(event) => changeBranch(event.currentTarget.value)}
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>{branch.name}</option>
        ))}
      </Select>
      <p className="text-sm text-muted-foreground">
        {configured
          ? 'Saved weekly hours are active for this branch.'
          : 'No weekly hours are saved yet. Customer availability stays unconfirmed until you save a schedule.'}
      </p>
      <form className="space-y-3" onSubmit={submit}>
        <div className="divide-y rounded-lg border">
          {schedule.map((day) => (
            <div key={day.dayOfWeek} className="grid gap-3 p-3 sm:grid-cols-[minmax(8rem,1fr)_2fr] sm:items-center">
              <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={day.isOpen}
                  disabled={busy}
                  onChange={(event) => updateDay(day.dayOfWeek, { isOpen: event.target.checked })}
                  className="size-4 accent-primary"
                />
                <span>{DAYS[day.dayOfWeek].name}</span>
                <span className="text-xs text-muted-foreground">
                  {day.isOpen ? 'Open' : 'Closed'}
                </span>
              </label>
              {day.isOpen ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="time"
                    label="Opens"
                    helperText="Opening time, Philippine time."
                    value={day.opensAt}
                    disabled={busy}
                    required
                    onChange={(event) => updateDay(day.dayOfWeek, { opensAt: event.target.value })}
                  />
                  <Input
                    type="time"
                    label="Closes"
                    helperText="Closing time, Philippine time."
                    value={day.closesAt}
                    disabled={busy}
                    required
                    onChange={(event) => updateDay(day.dayOfWeek, { closesAt: event.target.value })}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No appointment slots on this day.</p>
              )}
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" loading={busy} disabled={busy || !branchId}>
          Save service hours
        </Button>
      </form>
    </section>
  );
}
