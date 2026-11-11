'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import {
  ServiceAppointmentsQueryError,
  useStaffServiceAppointmentOptionsQuery,
  useStaffServiceAppointmentsQuery,
} from '@/data/appointments/client';
import { StaffServiceAppointmentCard } from '@/components/admin/appointments/StaffServiceAppointmentCard';
import { AppointmentClosureCalendar } from '@/components/admin/appointments/AppointmentClosureCalendar';
import { StaffServiceAppointmentForm } from '@/components/admin/appointments/StaffServiceAppointmentForm';
import {
  SERVICE_APPOINTMENT_STATUSES,
  type ServiceAppointmentFilters,
} from '@/lib/validations/service-appointments';

const EMPTY_FILTERS: ServiceAppointmentFilters = {
  status: '',
  branchId: '',
  date: '',
};

export function StaffServiceAppointments({
  userId,
  canManage,
  canWork,
}: {
  userId: string;
  canManage: boolean;
  canWork: boolean;
}) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const optionsQuery = useStaffServiceAppointmentOptionsQuery(userId);
  const appointmentsQuery = useStaffServiceAppointmentsQuery(userId, filters);
  const branches = optionsQuery.data?.branches ?? [];

  function updateFilter(field: keyof ServiceAppointmentFilters, value: string) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-sm font-medium text-primary">Workshop operations</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Service appointments</h1>
        <p className="mt-2 text-sm text-muted-foreground">Review customer requests, confirm schedules, and track service work.</p>
      </header>

      {canManage && (
        <details className="rounded-xl border bg-card p-5 sm:p-6">
          <summary className="cursor-pointer font-semibold">Create a confirmed appointment</summary>
          {optionsQuery.isPending ? (
            <div className="mt-4 h-20 animate-pulse rounded-lg bg-muted" role="status" aria-label="Loading appointment setup" />
          ) : optionsQuery.data?.branches.length ? (
            <div className="mt-5">
              <StaffServiceAppointmentForm userId={userId} branches={optionsQuery.data.branches} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {optionsQuery.error instanceof ServiceAppointmentsQueryError
                ? optionsQuery.error.message
                : 'No service branches are available to your account.'}
            </p>
          )}
        </details>
      )}

      {canManage && optionsQuery.data && (
        <AppointmentClosureCalendar userId={userId} branches={branches} />
      )}

      <section className="space-y-4">
        <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
          <Select
            label="Status"
            helperText="Show appointments in a specific status."
            value={filters.status}
            onChange={(event) => {
              const status = SERVICE_APPOINTMENT_STATUSES.find((item) => item === event.currentTarget.value) ?? '';
              updateFilter('status', status);
            }}
          >
            <option value="">All statuses</option>
            {SERVICE_APPOINTMENT_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
          </Select>
          <Select label="Branch" helperText="Limit results to a branch you can access." value={filters.branchId} onChange={(event) => updateFilter('branchId', event.currentTarget.value)}>
              <option value="">All accessible branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </Select>
          <DatePicker
            label="Scheduled date"
            name="scheduledDateFilter"
            helperText="Filter by scheduled date in Philippine time."
            value={filters.date}
            onChange={(value) => updateFilter('date', value)}
          />
        </div>

        {optionsQuery.isError && (
          <div className="space-y-2" role="alert">
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Branch filters could not be loaded. Existing appointments remain available.
            </p>
            <Button type="button" variant="outline" onClick={() => { void optionsQuery.refetch(); }}>Retry branch options</Button>
          </div>
        )}
        {!appointmentsQuery.data && appointmentsQuery.isPending && (
          <div className="space-y-3" role="status" aria-label="Loading appointments" aria-busy="true">
            <div className="h-48 animate-pulse rounded-xl border bg-card" />
            <div className="h-48 animate-pulse rounded-xl border bg-card" />
          </div>
        )}
        {!appointmentsQuery.data && appointmentsQuery.isError && (
          <div className="space-y-3">
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
              {appointmentsQuery.error instanceof ServiceAppointmentsQueryError
                ? appointmentsQuery.error.message
                : 'Appointments could not be loaded.'}
            </p>
            <Button type="button" variant="outline" onClick={() => { void appointmentsQuery.refetch(); }}>Try again</Button>
          </div>
        )}
        {appointmentsQuery.data && (
          <>
            {appointmentsQuery.isError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                Appointment updates could not be refreshed. Showing the last loaded data.
              </p>
            )}
            {appointmentsQuery.data.length ? (
              <div className="space-y-4">
                {appointmentsQuery.data.map((appointment) => (
                  <StaffServiceAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    userId={userId}
                    canManage={canManage}
                    canWork={canWork}
                  />
                ))}
                <p className="text-center text-xs text-muted-foreground">Showing up to 100 appointments per filter.</p>
              </div>
            ) : (
              <div className="rounded-xl border bg-card p-8 text-center">
                <h2 className="font-semibold">No appointments found</h2>
                <p className="mt-2 text-sm text-muted-foreground">Try changing the filters or check again later.</p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
