'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  ServiceAppointmentsQueryError,
  useCustomerServiceAppointmentsQuery,
} from '@/data/appointments/client';
import { formatPhp } from '@/lib/commerce';
import type { Database } from '@/types/database';

type CustomerAppointment =
  Database['public']['Functions']['customer_service_appointments']['Returns'][number];

function formatAppointmentDate(value: string | null) {
  if (!value) return 'Awaiting confirmation';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}

function AppointmentCard({ appointment }: { appointment: CustomerAppointment }) {
  const address = [
    appointment.address_line1,
    appointment.barangay,
    appointment.city,
    appointment.province,
  ].filter(Boolean).join(', ');

  return (
    <li className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{appointment.appointment_number}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {appointment.branch_name} · {appointment.service_mode.replaceAll('_', ' ')}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium capitalize">
          {appointment.status.replaceAll('_', ' ')}
        </span>
      </div>
      <div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
        <p><span className="text-muted-foreground">Service:</span> {appointment.service_type}</p>
        <p><span className="text-muted-foreground">Bike:</span> {appointment.bike_make} {appointment.bike_model}</p>
        <p>
          <span className="text-muted-foreground">
            {appointment.scheduled_at ? 'Scheduled:' : 'Preferred:'}
          </span>{' '}
          {formatAppointmentDate(appointment.scheduled_at ?? appointment.preferred_start_at)}
        </p>
        {(appointment.estimate_minor !== null || appointment.final_total_minor !== null) && (
          <p>
            <span className="text-muted-foreground">
              {appointment.final_total_minor !== null ? 'Final total:' : 'Estimate:'}
            </span>{' '}
            {formatPhp(appointment.final_total_minor ?? appointment.estimate_minor ?? 0)}
          </p>
        )}
        {address && <p className="sm:col-span-2"><span className="text-muted-foreground">Home service address:</span> {address}</p>}
      </div>
      <p className="mt-4 border-t pt-4 text-sm leading-6">{appointment.issue_description}</p>
    </li>
  );
}

export function CustomerServiceAppointments({ userId }: { userId: string }) {
  const query = useCustomerServiceAppointmentsQuery(userId);

  if (!query.data && query.isPending) {
    return <div className="h-40 animate-pulse rounded-xl border bg-card" role="status" aria-label="Loading appointments" />;
  }
  if (!query.data) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          {query.error instanceof ServiceAppointmentsQueryError ? query.error.message : 'Appointments could not be loaded.'}
        </p>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {query.isError && (
        <div className="space-y-2" role="alert">
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Appointment history could not be refreshed. Showing the last loaded data.
          </p>
          <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>Try again</Button>
        </div>
      )}
      {query.data.length ? (
        <ul className="space-y-4">
          {query.data.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} />)}
        </ul>
      ) : (
        <section className="rounded-xl border bg-card p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <h2 className="mt-3 font-semibold">No service appointments yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Book a branch visit or request service at home.</p>
          <Button asChild className="mt-4"><Link href="/dashboard/appointments/new">Book service</Link></Button>
        </section>
      )}
    </div>
  );
}
