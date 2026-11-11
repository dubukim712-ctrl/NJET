'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { StaffAppointmentManageForm } from '@/components/admin/appointments/StaffAppointmentManageForm';
import {
  useInvalidateServiceAppointmentsQuery,
} from '@/data/appointments/client';
import {
  updateAssignedServiceAppointmentStatusAction,
  updateServiceAppointmentNoteAction,
} from '@/data/actions/service-appointments';
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
}: {
  appointment: StaffServiceAppointment;
  userId: string;
  canManage: boolean;
  canWork: boolean;
}) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const invalidate = useInvalidateServiceAppointmentsQuery();
  const workTransitions = nextStatuses[appointment.status].filter((status) =>
    status === 'in_service' ||
    status === 'completed' ||
    (status === 'ready_for_pickup' && appointment.service_mode === 'branch_visit')
  );
  const canUpdateWorkStatus = canWork &&
    appointment.assigned_technician_id === userId &&
    workTransitions.length > 0;

  async function updateWorkStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const status = new FormData(event.currentTarget).get('workStatus');
      if (typeof status !== 'string') return;
      const result = await updateAssignedServiceAppointmentStatusAction({
        appointmentId: appointment.id,
        status,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      await invalidate();
    } catch (statusError) {
      console.error('Could not update service appointment status.', statusError);
      setError('Appointment status could not be updated. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const note = new FormData(event.currentTarget).get('note');
    if (typeof note !== 'string') return;
    setSaving(true);
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
    } catch (saveError) {
      console.error('Could not save appointment note.', saveError);
      setError('The note could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const address = [
    appointment.address_line1,
    appointment.barangay,
    appointment.city,
    appointment.province,
    appointment.postal_code,
  ].filter(Boolean).join(', ');

  return (
    <article className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{appointment.appointment_number} · {appointment.customer_name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{appointment.contact_number} · {appointment.branch_name}</p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium capitalize">{appointment.status.replaceAll('_', ' ')}</span>
      </div>
      <dl className="mt-4 grid gap-2 border-y py-4 text-sm sm:grid-cols-2">
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

      {canUpdateWorkStatus && (
        <form onSubmit={updateWorkStatus} className="mt-4 flex flex-wrap items-end gap-3">
          <Select
            name="workStatus"
            label="Update work status"
            helperText="Choose the next work state for this assigned job."
            containerClassName="min-w-52"
          >
            {workTransitions.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
          </Select>
          <Button type="submit" variant="outline" loading={saving}>Update status</Button>
        </form>
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
            <Button type="submit" variant="outline" loading={saving}>Save note</Button>
            {noteSaved && <span className="text-sm text-muted-foreground" role="status">Saved</span>}
          </div>
        </form>
      )}
      {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
    </article>
  );
}
