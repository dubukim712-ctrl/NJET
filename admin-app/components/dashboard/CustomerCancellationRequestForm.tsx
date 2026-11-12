'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useInvalidateServiceAppointmentsQuery } from '@/data/appointments/client';
import { requestServiceAppointmentCancellationAction } from '@/data/actions/service-appointment-cancellations';

export function CustomerCancellationRequestForm({
  appointmentId,
  onSubmitted,
}: {
  appointmentId: string;
  onSubmitted: () => void;
}) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const invalidate = useInvalidateServiceAppointmentsQuery();

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const formData = new FormData(event.currentTarget);
      const result = await requestServiceAppointmentCancellationAction({
        appointmentId,
        subject: formData.get('subject'),
        reason: formData.get('reason'),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSubmitted();
      await invalidate();
      toast.success('Cancellation request sent for staff review.');
    } catch (requestError) {
      console.error('Could not submit cancellation request.', requestError);
      setError('Your cancellation request could not be sent. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submitRequest} className="mt-4 space-y-3 border-t pt-4">
      <h3 className="font-medium">Request cancellation</h3>
      <p className="text-sm leading-6 text-muted-foreground">
        Your appointment stays active until staff reviews and approves your request.
      </p>
      <Input
        name="subject"
        label="Subject"
        minLength={3}
        maxLength={120}
        required
      />
      <Textarea
        name="reason"
        label="Reason"
        minLength={10}
        maxLength={1500}
        rows={3}
        required
      />
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" variant="outline" loading={saving}>
        Send cancellation request
      </Button>
    </form>
  );
}
