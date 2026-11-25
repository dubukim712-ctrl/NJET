'use client';

import { formatAppointmentBikeName } from '@/lib/appointment-bike-name';

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
import { StaffAppointmentDetails } from '@/components/admin/appointments/StaffAppointmentDetails';
import { canStartStaffWarrantyReview } from '@/lib/service-warranty';
import { StaffWarrantyPanel } from '@/components/admin/appointments/StaffWarrantyPanel';
import { StaffCancelAppointment } from '@/components/admin/appointments/StaffCancelAppointment';
import { formatStaffAppointmentDate, isClosedStaffAppointment } from '@/lib/staff-appointment-editing';
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

export function StaffServiceAppointmentCard({
  appointment,
  userId,
  canManage,
  canWork,
  cardOpen,
  onCardOpenChange,
  referenceTime = 0,
  hideSummary = false,
  hideWorkActions = false,
}: {
  appointment: StaffServiceAppointment;
  userId: string;
  canManage: boolean;
  canWork: boolean;
  cardOpen: boolean;
  onCardOpenChange: (open: boolean) => void;
  referenceTime?: number;
  hideSummary?: boolean;
  hideWorkActions?: boolean;
}) {
  const [error, setError] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [savingCancellation, setSavingCancellation] = useState<'approve' | 'reject' | null>(null);
  const [editingNote, setEditingNote] = useState(false);
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
      setEditingNote(false);
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

  const closed = isClosedStaffAppointment(appointment.status);
  const summarySlot = appointment.scheduled_at ?? (appointment.status === 'requested' ? appointment.preferred_start_at : null);
  const pastConfirmed = appointment.status === 'confirmed' && appointment.scheduled_at &&
    Date.parse(appointment.scheduled_at) < referenceTime;
  const cardSummary = (
    <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
      <div className="min-w-0">
        <h2 className="break-words font-semibold">{appointment.appointment_number} {' / '} {appointment.customer_name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {summarySlot ? (
            <>
              {appointment.scheduled_at ? 'Scheduled' : 'Requested time'}: <time dateTime={summarySlot}>{formatStaffAppointmentDate(summarySlot)}</time>
              {' (Philippine time)'}
            </>
          ) : 'No scheduled time'}
        </p>
        <p className="mt-1 break-words text-sm text-muted-foreground">
          {[
            appointment.branch_name,
            appointment.service_mode === 'home_service' ? 'Home service' : 'Branch visit',
            formatAppointmentBikeName(appointment.bike_make, appointment.bike_model),
          ].filter(Boolean).join(' / ')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {appointment.warranty_assessment && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Warranty assessment</span>}
        {appointment.cancellation_request && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">Cancellation requested</span>}
        {pastConfirmed && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">Past scheduled time</span>}
        <ServiceAppointmentStatusBadge status={appointment.status} />
        <ChevronDown
          className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </div>
    </summary>
  );
  const cardContent = (
    <div className={hideSummary ? 'space-y-4' : 'mt-4 space-y-4 border-t pt-4'}>
        <StaffAppointmentDetails appointment={appointment} />
        {canManage && (appointment.warranty_assessment || canStartStaffWarrantyReview(appointment.status)) && (
          <StaffWarrantyPanel appointmentId={appointment.id} userId={userId} status={appointment.status}
            existing={Boolean(appointment.warranty_assessment)} />
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

        {canManage && !closed && (
          <>
            <StaffAppointmentManageForm
              key={[appointment.status, appointment.scheduled_at, appointment.assigned_technician_id,
                appointment.estimate_minor, appointment.final_total_minor].join(':')}
              appointment={appointment}
              userId={userId}
              statusOptions={[appointment.status, ...nextStatuses[appointment.status]].filter(
                (status) => status !== 'cancelled' && (status !== 'ready_for_pickup' || appointment.service_mode === 'branch_visit')
              )}
            />
            {!appointment.cancellation_request && ['requested', 'confirmed'].includes(appointment.status) && (
              <StaffCancelAppointment appointmentId={appointment.id} reference={appointment.appointment_number} />
            )}
          </>
        )}

        {!hideWorkActions && (
          <AssignedServiceAppointmentWorkActions
            appointment={appointment}
            userId={userId}
            canWork={canWork}
          />
        )}

        <section className="space-y-3 border-t pt-4">
          <h3 className="font-semibold">Internal notes</h3>
          {editingNote ? (
            <form onSubmit={saveNote} className="space-y-2">
              <Textarea name="note" key={appointment.id + '-' + appointment.internal_note}
                label="Internal staff note" helperText="Visible to authorized staff only."
                defaultValue={appointment.internal_note} maxLength={4000} rows={3} />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" className="min-h-11" loading={savingNote}>Save note</Button>
                <Button type="button" variant="outline" className="min-h-11" disabled={savingNote}
                  onClick={() => setEditingNote(false)}>Discard changes</Button>
              </div>
            </form>
          ) : (
            <>
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{appointment.internal_note || 'No internal notes yet.'}</p>
              {(canManage || canWork) && (
                <Button type="button" variant="outline" className="min-h-11" onClick={() => { setError(''); setEditingNote(true); }}>
                  {appointment.internal_note ? 'Edit internal note' : 'Add internal note'}
                </Button>
              )}
            </>
          )}
        </section>
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
      {cardOpen && cardContent}
    </details>
  );
}
