'use client';

import { formatAppointmentBikeName } from '@/lib/appointment-bike-name';

import { useCallback, useState } from 'react';
import { SmartLink } from "@/components/ui/SmartLink";
import { ArrowRight, CalendarDays } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { ServiceAppointmentStatusBadge } from '@/components/appointments/ServiceAppointmentStatusBadge';
import { CustomerCancellationRequestForm } from '@/components/dashboard/CustomerCancellationRequestForm';
import { CustomerServiceAppointmentsSkeleton } from '@/components/dashboard/CustomerServiceAppointmentsSkeleton';
import { RealtimeStatus } from '@/components/realtime/RealtimeStatus';
import { Button } from '@/components/ui/Button';
import {
  ServiceAppointmentsQueryError,
  useCustomerServiceAppointmentsQuery,
  useInvalidateServiceAppointmentsQuery,
} from '@/data/appointments/client';
import { useCustomerServiceAppointmentsRealtime } from '@/components/realtime/useCustomerServiceAppointmentsRealtime';
import { formatPhp } from '@/lib/commerce';
import type { Database } from '@/types/database';

type CustomerAppointment =
  Database['public']['Functions']['customer_service_appointments']['Returns'][number] & {
    bike_serial_number?: string | null;
    cancellation_request: {
      subject: string;
      reason: string;
      status: 'pending' | 'approved' | 'rejected';
      created_at: string;
    } | null;
  };

const appointmentFilters = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Upcoming & Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
] as const;

const activeStatuses = new Set(['requested', 'confirmed', 'in_service', 'ready_for_pickup']);

function formatAppointmentDate(value: string | null) {
  if (!value) return 'Awaiting confirmation';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}

export function CustomerAppointmentCard({ appointment, defaultExpanded = false }: {
  appointment: CustomerAppointment;
  defaultExpanded?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(defaultExpanded);
  const detailsId = `appointment-details-${appointment.id}`;
  const serviceType = appointment.service_type.charAt(0).toUpperCase() + appointment.service_type.slice(1);
  const serviceMode = appointment.service_mode === 'home_service' ? 'Home service' : 'Branch visit';
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
            {appointment.branch_name} · {serviceMode}
          </p>
        </div>
        <ServiceAppointmentStatusBadge status={appointment.status} />
      </div>
      <div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
        <p><span className="text-muted-foreground">Service:</span> {serviceType}</p>
        <p><span className="text-muted-foreground">Bike:</span> {formatAppointmentBikeName(appointment.bike_make, appointment.bike_model)}</p>
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
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          aria-expanded={showDetails}
          aria-controls={detailsId}
          aria-label={`${showDetails ? 'Hide' : 'View'} details for appointment ${appointment.appointment_number}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => setShowDetails((open) => !open)}
        >
          {showDetails ? 'Hide details' : 'View details'} <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div id={detailsId} hidden={!showDetails} className="mt-2 border-t pt-4">
        {appointment.bike_serial_number && (
          <p className="break-words text-sm"><span className="text-muted-foreground">Serial number:</span> {appointment.bike_serial_number}</p>
        )}
        {address && <p className="break-words text-sm"><span className="text-muted-foreground">Home service address:</span> {address}</p>}
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{appointment.issue_description}</p>
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
              className="min-h-11"
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
      </div>
    </li>
  );
}

export function CustomerServiceAppointments() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<(typeof appointmentFilters)[number]['id']>('all');
  const userId = user?.id ?? '';
  const query = useCustomerServiceAppointmentsQuery(userId);
  const invalidateAppointments = useInvalidateServiceAppointmentsQuery();
  const refreshAppointments = useCallback(() => {
    void invalidateAppointments();
  }, [invalidateAppointments]);
  const realtimeState = useCustomerServiceAppointmentsRealtime(userId, refreshAppointments);

  if (!user) {
    return (
      <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground" role="alert">
        Your session has ended. Sign in to view your appointments.
      </p>
    );
  }

  if (!query.data && query.isPending) {
    return <CustomerServiceAppointmentsSkeleton realtimeState={realtimeState} />;
  }
  if (!query.data) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <RealtimeStatus state={realtimeState} />
        </div>
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          {query.error instanceof ServiceAppointmentsQueryError ? query.error.message : 'Appointments could not be loaded.'}
        </p>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>Try again</Button>
      </div>
    );
  }

  const visibleAppointments = query.data.filter(({ status }) =>
    filter === 'all' || (filter === 'active' ? activeStatuses.has(status) : status === filter),
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RealtimeStatus state={realtimeState} />
      </div>
      {query.isError && (
        <div className="space-y-2" role="alert">
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Appointment history could not be refreshed. Showing the last loaded data.
          </p>
          <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>Try again</Button>
        </div>
      )}
      <div role="group" aria-label="Filter appointments by status" className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain p-1">
        {appointmentFilters.map(({ id, label }) => (
          <Button
            key={id}
            type="button"
            variant={filter === id ? 'default' : 'outline'}
            aria-pressed={filter === id}
            className="min-h-11 shrink-0 rounded-full"
            onClick={() => setFilter(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      {visibleAppointments.length ? (
        <ul className="space-y-4">
          {visibleAppointments.map((appointment) => <CustomerAppointmentCard key={appointment.id} appointment={appointment} />)}
        </ul>
      ) : query.data.length ? (
        <p role="status" className="rounded-xl border bg-card p-5 text-center text-sm text-muted-foreground">
          No appointments match this filter.
        </p>
      ) : (
        <section className="rounded-xl border bg-card p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <h2 className="mt-3 font-semibold">No service appointments yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Book a branch visit or request service at home.</p>
          <Button asChild className="mt-4"><SmartLink href="/dashboard/appointments/new">Book service</SmartLink></Button>
        </section>
      )}
    </div>
  );
}
