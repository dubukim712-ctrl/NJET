'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { RealtimeStatus } from '@/components/realtime/RealtimeStatus';
import { useRealtimeChanges } from '@/components/realtime/useRealtimeChanges';
import { StaffServiceAppointmentCard } from '@/components/admin/appointments/StaffServiceAppointmentCard';
import { StaffServiceAppointmentsSkeleton } from '@/components/admin/appointments/StaffServiceAppointmentsSkeleton';
import { TechnicianTaskCard } from '@/components/admin/appointments/TechnicianTaskCard';
import {
  ServiceAppointmentsQueryError,
  useInvalidateServiceAppointmentsQuery,
  useMyAssignedServiceAppointmentsQuery,
} from '@/data/appointments/client';
import type { StaffServiceAppointment } from '@/data/appointments/queries';
import type { ServiceAppointmentStatus } from '@/types/commerce-tables';

type TaskFilter = 'all' | 'active' | 'in_service' | 'ready_for_pickup' | 'completed';

const ACTIVE_STATUSES: ServiceAppointmentStatus[] = [
  'requested',
  'confirmed',
  'in_service',
  'ready_for_pickup',
];

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: 'all', label: 'All tasks' },
  { id: 'active', label: 'Active' },
  { id: 'in_service', label: 'In progress' },
  { id: 'ready_for_pickup', label: 'Ready for pickup' },
  { id: 'completed', label: 'Completed' },
];

const REALTIME_TABLES = [
  'service_appointments',
  'service_appointment_internal_notes',
] as const;
const EMPTY_TASKS: StaffServiceAppointment[] = [];
const TASK_GRID_CLASS = 'grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3';

function matchesSearch(appointment: StaffServiceAppointment, search: string) {
  if (!search) return true;
  return [
    appointment.appointment_number,
    appointment.customer_name,
    appointment.contact_number,
    appointment.bike_make,
    appointment.bike_model,
    appointment.bike_serial_number ?? '',
    appointment.branch_name,
  ].some((value) => value.toLocaleLowerCase().includes(search));
}

function matchesFilter(appointment: StaffServiceAppointment, filter: TaskFilter) {
  if (filter === 'all') return true;
  if (filter === 'active') return ACTIVE_STATUSES.includes(appointment.status);
  return appointment.status === filter;
}

export function TechnicianMyTasks({ userId }: { userId: string }) {
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [openAppointmentId, setOpenAppointmentId] = useState<string | null>(null);
  const appointmentsQuery = useMyAssignedServiceAppointmentsQuery(userId);
  const invalidateAppointments = useInvalidateServiceAppointmentsQuery();
  const invalidateOnRealtimeChange = useCallback(() => {
    void invalidateAppointments();
  }, [invalidateAppointments]);
  const realtimeState = useRealtimeChanges(
    `technician-my-tasks-${userId}`,
    REALTIME_TABLES,
    invalidateOnRealtimeChange,
  );

  useEffect(() => {
    const timer = window.setTimeout(
      () => setSearch(searchInput.trim().toLocaleLowerCase()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const tasks = appointmentsQuery.data ?? EMPTY_TASKS;
  const selectedAppointment = tasks.find((task) => task.id === openAppointmentId) ?? null;
  const visibleTasks = useMemo(
    () => tasks
      .filter((task) => matchesFilter(task, filter) && matchesSearch(task, search))
      .sort(
        (a, b) =>
          Number(a.status === 'completed') - Number(b.status === 'completed'),
      ),
    [tasks, filter, search],
  );
  const filterCounts = useMemo(() => ({
    all: tasks.length,
    active: tasks.filter((task) => ACTIVE_STATUSES.includes(task.status)).length,
    in_service: tasks.filter((task) => task.status === 'in_service').length,
    ready_for_pickup: tasks.filter((task) => task.status === 'ready_for_pickup').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  }), [tasks]);
  const initialLoading = !appointmentsQuery.data && appointmentsQuery.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Workshop operations
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">My tasks</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Service work assigned to you, including recent completions.
          </p>
        </div>
        {!initialLoading && <RealtimeStatus state={realtimeState} />}
      </header>

      <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5" aria-label="Task filters">
        <Input
          label="Search my tasks"
          type="search"
          placeholder="Appointment, customer, phone, or bike"
          value={searchInput}
          maxLength={100}
          onChange={(event) => setSearchInput(event.currentTarget.value)}
        />
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter tasks by status">
          {FILTERS.map(({ id, label }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={filter === id ? 'default' : 'outline'}
              aria-pressed={filter === id}
              onClick={() => {
                setFilter(id);
                setOpenAppointmentId(null);
              }}
            >
              {label} <span className="ml-1 tabular-nums">{filterCounts[id]}</span>
            </Button>
          ))}
        </div>
      </section>

      {initialLoading && <StaffServiceAppointmentsSkeleton className={TASK_GRID_CLASS} />}
      {!appointmentsQuery.data && appointmentsQuery.isError && (
        <div className="space-y-3">
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
            {appointmentsQuery.error instanceof ServiceAppointmentsQueryError
              ? appointmentsQuery.error.message
              : 'Your assigned tasks could not be loaded.'}
          </p>
          <Button type="button" variant="outline" onClick={() => void appointmentsQuery.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {appointmentsQuery.data && (
        <>
          {appointmentsQuery.isError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
              Tasks could not be refreshed. Showing the last loaded data.
            </p>
          )}
          {appointmentsQuery.isFetching && (
            <p className="text-sm text-muted-foreground" role="status">Updating your tasks…</p>
          )}
          {visibleTasks.length ? (
            <div className={TASK_GRID_CLASS}>
              {visibleTasks.map((appointment) => (
                <TechnicianTaskCard
                  key={appointment.id}
                  appointment={appointment}
                  userId={userId}
                  onView={() => setOpenAppointmentId(appointment.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-8 text-center">
              <h2 className="font-semibold">
                {search ? 'No matching tasks' : 'No tasks in this view'}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {search
                  ? 'Try another appointment, customer, or bike search.'
                  : 'Assigned active tasks and completions from the past 30 days will appear here.'}
              </p>
            </div>
          )}
          <Modal
            open={selectedAppointment !== null}
            title={selectedAppointment
              ? `${selectedAppointment.appointment_number} · ${selectedAppointment.customer_name}`
              : 'Task details'}
            onClose={() => setOpenAppointmentId(null)}
            size="wide"
          >
            {selectedAppointment && (
              <StaffServiceAppointmentCard
                appointment={selectedAppointment}
                userId={userId}
                canManage={false}
                canWork
                cardOpen
                onCardOpenChange={() => setOpenAppointmentId(null)}
                hideSummary
                hideWorkActions
              />
            )}
          </Modal>
        </>
      )}
    </div>
  );
}
