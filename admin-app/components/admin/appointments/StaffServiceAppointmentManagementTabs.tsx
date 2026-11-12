import { AppointmentClosureCalendar } from '@/components/admin/appointments/AppointmentClosureCalendar';
import { StaffServiceAppointmentForm } from '@/components/admin/appointments/StaffServiceAppointmentForm';
import { Button } from '@/components/ui/Button';
import { ServiceAppointmentsQueryError } from '@/data/appointments/client';
import type { useStaffServiceAppointmentOptionsQuery } from '@/data/appointments/client';

type OptionsQuery = ReturnType<typeof useStaffServiceAppointmentOptionsQuery>;
type Branch = { id: string; name: string };
type Tab = 'appointments' | 'create' | 'schedule';

export function StaffServiceAppointmentManagementTabs({
  userId,
  branches,
  selectedTab,
  optionsQuery,
}: {
  userId: string;
  branches: Branch[];
  selectedTab: Tab;
  optionsQuery: OptionsQuery;
}) {
  return (
    <>
      <section
        id="appointments-create-panel"
        role="tabpanel"
        aria-labelledby="appointments-create-tab"
        tabIndex={0}
        hidden={selectedTab !== 'create'}
        className="rounded-xl border bg-card p-5 sm:p-6"
      >
        <header className="mb-5">
          <h2 className="text-xl font-semibold">Create Appointment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule and assign a confirmed service appointment.
          </p>
        </header>
        {optionsQuery.isPending ? (
          <div
            className="h-20 animate-pulse rounded-lg bg-muted"
            role="status"
            aria-label="Loading appointment setup"
          />
        ) : optionsQuery.data?.branches.length ? (
          <StaffServiceAppointmentForm userId={userId} branches={optionsQuery.data.branches} />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {optionsQuery.error instanceof ServiceAppointmentsQueryError
                ? optionsQuery.error.message
                : 'No service branches are available to your account.'}
            </p>
            {optionsQuery.isError && (
              <Button type="button" variant="outline" onClick={() => { void optionsQuery.refetch(); }}>
                Retry branch options
              </Button>
            )}
          </div>
        )}
      </section>

      <section
        id="appointments-schedule-panel"
        role="tabpanel"
        aria-labelledby="appointments-schedule-tab"
        tabIndex={0}
        hidden={selectedTab !== 'schedule'}
      >
        {optionsQuery.isPending ? (
          <div
            className="h-32 animate-pulse rounded-xl border bg-card"
            role="status"
            aria-label="Loading branch schedule"
          />
        ) : optionsQuery.data ? (
          <AppointmentClosureCalendar userId={userId} branches={branches} />
        ) : optionsQuery.isError ? (
          <div className="space-y-3 rounded-xl border bg-card p-5">
            <p className="text-sm text-destructive" role="alert">
              {optionsQuery.error instanceof ServiceAppointmentsQueryError
                ? optionsQuery.error.message
                : 'Branch schedule could not be loaded.'}
            </p>
            <Button type="button" variant="outline" onClick={() => { void optionsQuery.refetch(); }}>
              Retry branch options
            </Button>
          </div>
        ) : null}
      </section>
    </>
  );
}
