'use client';

import { Button } from '@/components/ui/Button';
import { ServiceAppointmentStatusBadge } from '@/components/appointments/ServiceAppointmentStatusBadge';
import { AssignedServiceAppointmentWorkActions } from '@/components/admin/appointments/AssignedServiceAppointmentWorkActions';
import type { StaffServiceAppointment } from '@/data/appointments/queries';

function formatTaskDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Manila',
      }).format(new Date(value))
    : 'Not scheduled';
}

export function TechnicianTaskCard({
  appointment,
  userId,
  onView,
}: {
  appointment: StaffServiceAppointment;
  userId: string;
  onView: () => void;
}) {
  const taskDate = appointment.scheduled_at ?? appointment.preferred_start_at;

  return (
    <article className="flex h-full min-w-0 flex-col rounded-xl border bg-card p-5 sm:p-6">
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Service task
          </p>
          <h2 className="mt-1 break-words font-semibold">
            {appointment.appointment_number}
          </h2>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {appointment.customer_name}
          </p>
        </div>
        <ServiceAppointmentStatusBadge status={appointment.status} />
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {appointment.service_type}
        </span>
        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium capitalize text-primary">
          {appointment.service_mode.replaceAll('_', ' ')}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Bike</dt>
          <dd className="mt-0.5 break-words font-medium">
            {appointment.bike_make} {appointment.bike_model}
            {appointment.bike_serial_number && ` · ${appointment.bike_serial_number}`}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">
            {appointment.scheduled_at ? 'Scheduled' : 'Preferred'}
          </dt>
          <dd className="mt-0.5 break-words font-medium">
            {formatTaskDate(taskDate)}
          </dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Branch</dt>
          <dd className="mt-0.5 break-words font-medium">
            {appointment.branch_name}
          </dd>
        </div>
      </dl>

      <div className="mt-auto space-y-3 border-t pt-4">
        <AssignedServiceAppointmentWorkActions
          appointment={appointment}
          userId={userId}
          canWork
        />
        <Button
          type="button"
          variant={
            appointment.status === 'confirmed' || appointment.status === 'in_service'
              ? 'outline'
              : 'default'
          }
          className="w-full"
          aria-label={`View task details for ${appointment.appointment_number}`}
          onClick={onView}
        >
          View
        </Button>
      </div>
    </article>
  );
}
