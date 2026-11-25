'use client';

import { ChevronRight } from 'lucide-react';
import { isPastConfirmedTask } from '@/lib/technician-task-order';
import { formatAppointmentBikeName } from '@/lib/appointment-bike-name';

import { Button } from '@/components/ui/Button';
import { ServiceAppointmentStatusBadge } from '@/components/appointments/ServiceAppointmentStatusBadge';
import { AssignedServiceAppointmentWorkActions } from '@/components/admin/appointments/AssignedServiceAppointmentWorkActions';
import type { StaffServiceAppointment } from '@/data/appointments/queries';

const taskDateFormat = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Manila',
});

const serviceLabels = {
  maintenance: 'Maintenance',
  repair: 'Repair',
  inspection: 'Inspection',
  other: 'Other service',
};

export function TechnicianTaskCard({
  appointment,
  userId,
  referenceTime,
  onView,
}: {
  appointment: StaffServiceAppointment;
  userId: string;
  referenceTime: number;
  onView: () => void;
}) {
  const taskDate = appointment.scheduled_at ?? appointment.preferred_start_at;
  const pastConfirmed = isPastConfirmedTask(appointment, referenceTime);

  return (
    <article className="flex h-full min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold">
            {appointment.appointment_number}
          </h2>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {appointment.customer_name}
          </p>
        </div>
        <ServiceAppointmentStatusBadge status={appointment.status} />
      </header>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {serviceLabels[appointment.service_type]}
        </span>
        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {appointment.service_mode === 'home_service' ? 'Home service' : 'Branch visit'}
        </span>
        {pastConfirmed && (
          <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Past scheduled time
          </span>
        )}
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-xs text-muted-foreground">
            {appointment.scheduled_at ? 'Scheduled time' : 'Requested time'} (Philippine time)
          </dt>
          <dd className="mt-0.5 break-words font-medium">
            <time dateTime={taskDate}>{taskDateFormat.format(new Date(taskDate))}</time>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Bike</dt>
          <dd className="mt-0.5 break-words font-medium">
            {formatAppointmentBikeName(appointment.bike_make, appointment.bike_model)}
            {appointment.bike_serial_number && (
              <span className="mt-1 block text-sm font-normal text-muted-foreground">
                Serial number {appointment.bike_serial_number}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Branch</dt>
          <dd className="mt-0.5 break-words font-medium">{appointment.branch_name}</dd>
        </div>
      </dl>

      <div className="mt-auto space-y-3 border-t pt-4">
        <AssignedServiceAppointmentWorkActions
          appointment={appointment}
          userId={userId}
          canWork
          primaryOnly
        />
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full gap-2"
          aria-label={`View task details for ${appointment.appointment_number}`}
          onClick={onView}
        >
          View details <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
