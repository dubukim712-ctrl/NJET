'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { ServiceAppointmentStatusBadge } from '@/components/appointments/ServiceAppointmentStatusBadge';
import { CustomerCancellationRequestForm } from '@/components/dashboard/CustomerCancellationRequestForm';
import { Button } from '@/components/ui/Button';
import {
  ServiceAppointmentsQueryError,
  useCustomerServiceAppointmentsQuery,
} from '@/data/appointments/client';
import { formatPhp } from '@/lib/commerce';
import type { Database } from '@/types/database';

type CustomerAppointment =
  Database['public']['Functions']['customer_service_appointments']['Returns'][number] & {
    cancellation_request: {
      subject: string;
      reason: string;
      status: 'pending' | 'approved' | 'rejected';
      created_at: string;
    } | null;
  };

function formatAppointmentDate(value: string | null) {
  if (!value) return 'Awaiting confirmation';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}

function AppointmentCard({ appointment }: { appointment: CustomerAppointment }) {
  const [showCancellationForm, setShowCancellationForm] = useState(false);
  const address = [
    appointment.address_line1,
    appointment.barangay,
    appointment.city,
    appointment.province,
  ].filter(Boolean).join(', ');
  const canRequestCancellation =
    ['requested', 'confirmed'].includes(appointment.status) &&
    appointment.cancellation_request?.status !== 'pending';

  return (
    <li className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{appointment.appointment_number}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {appointment.branch_name} · {appointment.service_mode.replaceAll('_', ' ')}
          </p>
        </div>
        <ServiceAppointmentStatusBadge status={appointment.status} />
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
      {appointment.status === 'requested' && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6">
          Your selected date is tentative and may change based on technician availability. Staff will confirm the appointment date and time.
        </p>
      )}
      {appointment.cancellation_request && (
        <div className="mt-4 rounded-lg border p-3 text-sm">
          <p className="font-medium">
            Cancellation request: {appointment.cancellation_request.status}
          </p>
          <p className="mt-1">{appointment.cancellation_request.subject}</p>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
            {appointment.cancellation_request.reason}
          </p>
          {appointment.cancellation_request.status === 'pending' && (
            <p className="mt-2 text-muted-foreground">Waiting for staff review. Your appointment remains active.</p>
          )}
        </div>
      )}
      {canRequestCancellation && (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            aria-expanded={showCancellationForm}
            aria-controls={`cancellation-form-${appointment.id}`}
            onClick={() => setShowCancellationForm((show) => !show)}
          >
            {showCancellationForm ? 'Keep appointment' : 'Cancel appointment'}
          </Button>
          {showCancellationForm && (
            <div id={`cancellation-form-${appointment.id}`}>
              <CustomerCancellationRequestForm
                appointmentId={appointment.id}
                onSubmitted={() => setShowCancellationForm(false)}
              />
            </div>
          )}
        </div>
      )}
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
