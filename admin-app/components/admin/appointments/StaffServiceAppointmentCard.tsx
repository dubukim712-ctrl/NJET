'use client';

import { useState, type FormEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceAppointmentStatusBadge } from '@/components/appointments/ServiceAppointmentStatusBadge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { StaffAppointmentManageForm } from '@/components/admin/appointments/StaffAppointmentManageForm';
import { AssignedServiceAppointmentWorkActions } from '@/components/admin/appointments/AssignedServiceAppointmentWorkActions';
import { useInvalidateServiceAppointmentsQuery } from '@/data/appointments/client';
import {
  updateServiceAppointmentNoteAction,
} from '@/data/actions/service-appointments';
import { reviewServiceAppointmentCancellationAction } from '@/data/actions/service-appointment-cancellations';
import { formatPhp } from '@/lib/commerce';
import type { StaffServiceAppointment } from '@/data/appointments/queries';
import type { ServiceAppointmentStatus } from '@/types/commerce-tables';

const nextStatuses: Record<ServiceAppointmentStatus, ServiceAppointmentStatus[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['in_service', 'cancelled', 'no_show'],
  in_service: ['ready_for_pickup', 'completed'],
  ready_for_pickup: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
};

function displayDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Manila',
      }).format(new Date(value))
    : 'Not scheduled';
}

export function StaffServiceAppointmentCard({
  appointment,
  userId,
  canManage,
  canWork,
  cardOpen,
  onCardOpenChange,
  hideSummary = false,
  hideWorkActions = false,
}: {
  appointment: StaffServiceAppointment;
  userId: string;
  canManage: boolean;
  canWork: boolean;
  cardOpen: boolean;
  onCardOpenChange: (open: boolean) => void;
  hideSummary?: boolean;
  hideWorkActions?: boolean;
}) {
  const [error, setError] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [savingCancellation, setSavingCancellation] = useState<'approve' | 'reject' | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const invalidate = useInvalidateServiceAppointmentsQuery();

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const note = new FormData(event.currentTarget).get('note');
    if (typeof note !== 'string') return;
    setSavingNote(true);
    try {
      const result = await updateServiceAppointmentNoteAction({
        appointmentId: appointment.id,
        note,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNoteSaved(true);
      await invalidate();
      toast.success('Appointment note saved.');
    } catch (saveError) {
      console.error('Could not save appointment note.', saveError);
      setError('The note could not be saved. Please try again.');
    } finally {
      setSavingNote(false);
    }
  }

  async function reviewCancellation(decision: 'approve' | 'reject') {
    setError('');
    setSavingCancellation(decision);
    try {
      const request = appointment.cancellation_request;
      if (!request) return;
      const result = await reviewServiceAppointmentCancellationAction({
        requestId: request.id,
        decision,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      await invalidate();
      toast.success(
        decision === 'approve'
          ? 'Appointment cancellation approved.'
          : 'Cancellation request rejected.'
      );
    } catch (reviewError) {
      console.error('Could not review appointment cancellation request.', reviewError);
      setError('The cancellation request could not be reviewed. Please try again.');
    } finally {
      setSavingCancellation(null);
    }
  }

  const address = [
    appointment.address_line1,
    appointment.barangay,
    appointment.city,
    appointment.province,
    appointment.postal_code,
  ].filter(Boolean).join(', ');

  const cardSummary = (
    <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
      <div>
        <h2 className="font-semibold">{appointment.appointment_number} · {appointment.customer_name}</h2>
      </div>
      <div className="flex items-center gap-3">
        <ServiceAppointmentStatusBadge status={appointment.status} />
        <ChevronDown
          className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </div>
    </summary>
  );
  const cardContent = (
    <div className={hideSummary ? 'space-y-4' : 'mt-4 border-t pt-4'}>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="inline text-muted-foreground">Contact: </dt><dd className="inline">{appointment.contact_number}</dd></div>
          <div><dt className="inline text-muted-foreground">Branch: </dt><dd className="inline">{appointment.branch_name}</dd></div>
          <div><dt className="inline text-muted-foreground">Service: </dt><dd className="inline capitalize">{appointment.service_type} · {appointment.service_mode.replaceAll('_', ' ')}</dd></div>
          <div><dt className="inline text-muted-foreground">Bike: </dt><dd className="inline">{appointment.bike_make} {appointment.bike_model}{appointment.bike_serial_number ? ` · ${appointment.bike_serial_number}` : ''}</dd></div>
          <div><dt className="inline text-muted-foreground">Preferred: </dt><dd className="inline">{displayDate(appointment.preferred_start_at)}</dd></div>
          <div><dt className="inline text-muted-foreground">Scheduled: </dt><dd className="inline">{displayDate(appointment.scheduled_at)}</dd></div>
          <div><dt className="inline text-muted-foreground">Technician: </dt><dd className="inline">{appointment.assigned_technician_name ?? 'Unassigned'}</dd></div>
          {address && <div className="sm:col-span-2"><dt className="inline text-muted-foreground">Home address: </dt><dd className="inline">{address}</dd></div>}
          <div className="sm:col-span-2"><dt className="inline text-muted-foreground">Service notes: </dt><dd className="inline whitespace-pre-wrap">{appointment.issue_description}</dd></div>
          {(appointment.estimate_minor !== null || appointment.final_total_minor !== null) && (
            <div className="sm:col-span-2">
              <dt className="inline text-muted-foreground">Estimate / final: </dt>
              <dd className="inline">{appointment.estimate_minor === null ? '—' : formatPhp(appointment.estimate_minor)} / {appointment.final_total_minor === null ? '—' : formatPhp(appointment.final_total_minor)}</dd>
            </div>
          )}
        </dl>

        {canManage && (
          <StaffAppointmentManageForm
            key={`${appointment.status}-${appointment.scheduled_at}-${appointment.assigned_technician_id}-${appointment.estimate_minor}-${appointment.final_total_minor}`}
            appointment={appointment}
            userId={userId}
            statusOptions={[appointment.status, ...nextStatuses[appointment.status]]}
          />
        )}

        {canManage && appointment.cancellation_request && (
        <section className="mt-4 space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div>
            <h3 className="font-medium">Cancellation request for review</h3>
            <p className="mt-1 text-sm font-medium">{appointment.cancellation_request.subject}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {appointment.cancellation_request.reason}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="destructive"
              loading={savingCancellation === 'approve'}
              disabled={savingCancellation !== null}
              onClick={() => { void reviewCancellation('approve'); }}
            >
              Approve cancellation
            </Button>
            <Button
              type="button"
              variant="outline"
              loading={savingCancellation === 'reject'}
              disabled={savingCancellation !== null}
              onClick={() => { void reviewCancellation('reject'); }}
            >
              Reject request
            </Button>
          </div>
        </section>
        )}

        {!hideWorkActions && (
          <AssignedServiceAppointmentWorkActions
            appointment={appointment}
            userId={userId}
            canWork={canWork}
          />
        )}

        {(canManage || canWork) && (
        <form onSubmit={saveNote} className="mt-4 space-y-2 border-t pt-4">
          <Textarea
            name="note"
            key={`${appointment.id}-${appointment.internal_note}`}
            label="Internal staff note"
            helperText="Visible to authorized staff only; customers cannot see this note."
            defaultValue={appointment.internal_note}
            maxLength={4000}
            rows={3}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" variant="outline" loading={savingNote}>Save note</Button>
            {noteSaved && <span className="text-sm text-muted-foreground" role="status">Saved</span>}
          </div>
        </form>
        )}
        {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
      </div>
  );
  if (hideSummary) return cardContent;

  return (
    <details
      className="group rounded-xl border bg-card p-5 sm:p-6"
      open={cardOpen}
      onToggle={(event) => {
        if (event.currentTarget.open !== cardOpen) {
          onCardOpenChange(event.currentTarget.open);
        }
      }}
    >
      {cardSummary}
      {cardContent}
    </details>
  );
}
