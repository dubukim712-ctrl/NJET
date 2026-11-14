'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { useInvalidateServiceAppointmentsQuery } from '@/data/appointments/client';
import { updateAssignedServiceAppointmentStatusAction } from '@/data/actions/service-appointments';
import type { StaffServiceAppointment } from '@/data/appointments/queries';
import type { ServiceAppointmentStatus } from '@/types/commerce-tables';

export function AssignedServiceAppointmentWorkActions({
  appointment,
  userId,
  canWork,
}: {
  appointment: StaffServiceAppointment;
  userId: string;
  canWork: boolean;
}) {
  const [savingStatus, setSavingStatus] = useState<ServiceAppointmentStatus | null>(null);
  const [error, setError] = useState('');
  const invalidate = useInvalidateServiceAppointmentsQuery();
  const isAssignedWorker = canWork && appointment.assigned_technician_id === userId;
  const primaryAction: { label: string; status: ServiceAppointmentStatus } | null =
    appointment.status === 'confirmed'
      ? { label: 'Start service', status: 'in_service' }
      : appointment.status === 'in_service'
        ? appointment.service_mode === 'branch_visit'
          ? { label: 'Mark ready for pickup', status: 'ready_for_pickup' }
          : { label: 'Finish repair', status: 'completed' }
        : null;

  if (!isAssignedWorker) return null;

  async function updateStatus(status: ServiceAppointmentStatus) {
    setError('');
    setSavingStatus(status);
    try {
      const result = await updateAssignedServiceAppointmentStatusAction({
        appointmentId: appointment.id,
        status,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      await invalidate();
      toast.success(
        status === 'no_show'
          ? 'Appointment marked as no-show.'
          : `Appointment moved to ${status.replaceAll('_', ' ')}.`
      );
    } catch (statusError) {
      console.error('Could not update service appointment status.', statusError);
      setError('Appointment status could not be updated. Please try again.');
    } finally {
      setSavingStatus(null);
    }
  }

  return (
    <div className="space-y-2">
      {primaryAction && (
        <Button
          type="button"
          className="w-full"
          loading={savingStatus === primaryAction.status}
          disabled={savingStatus !== null}
          onClick={() => { void updateStatus(primaryAction.status); }}
        >
          {primaryAction.label}
        </Button>
      )}
      {appointment.status === 'confirmed' && (
        <Button
          type="button"
          size="sm"
          variant="link"
          loading={savingStatus === 'no_show'}
          disabled={savingStatus !== null}
          onClick={() => { void updateStatus('no_show'); }}
        >
          Mark as no-show
        </Button>
      )}
      {appointment.status === 'ready_for_pickup' && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground" role="status">
          Repair finished — waiting for Sales/Cashier release.
        </p>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
