'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cancelStaffServiceAppointmentAction } from '@/data/actions/service-appointment-cancellations';
import { useInvalidateServiceAppointmentsQuery } from '@/data/appointments/client';

export function StaffCancelAppointment({ appointmentId, reference }: { appointmentId: string; reference: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalidate = useInvalidateServiceAppointmentsQuery();

  async function cancel() {
    setSaving(true);
    setError(null);
    try {
      const result = await cancelStaffServiceAppointmentAction(appointmentId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast.success('Appointment cancelled.');
      await invalidate();
    } catch {
      setError('Could not cancel the appointment. Check its current status before trying again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className="min-h-11 text-destructive" onClick={() => {
        setError(null);
        setOpen(true);
      }}>
        Cancel appointment
      </Button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title={'Cancel ' + reference + '?'}
        description="This will cancel the appointment. Contact the customer if you need to arrange another time."
        confirmLabel="Cancel appointment" cancelLabel="Keep appointment" destructive loading={saving}
        error={error} onConfirm={() => void cancel()} />
    </>
  );
}
