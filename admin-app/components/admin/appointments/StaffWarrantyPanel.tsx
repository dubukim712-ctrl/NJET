'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { StaffWarrantyExchange } from './StaffWarrantyExchange';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { WarrantySummary } from '@/components/appointments/WarrantySummary';
import { useInvalidateServiceAppointmentsQuery } from '@/data/appointments/client';
import { getStaffWarrantyDetailsAction, saveStaffWarrantyAction, startStaffWarrantyReviewAction } from '@/data/actions/service-warranty';
import { canStartStaffWarrantyReview, warrantyDecisions } from '@/lib/service-warranty';
import type { ServiceAppointmentStatus } from '@/types/commerce-tables';

const decisions = ['covered_repair', 'replacement_approved', 'paid_repair', 'further_review'] as const;
type Mode = 'link' | 'review';

export function StaffWarrantyPanel({ appointmentId, userId, status, existing }: {
  appointmentId: string;
  userId: string;
  status: ServiceAppointmentStatus;
  existing: boolean;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [started, setStarted] = useState(false);
  const hasReview = existing || started;
  const invalidate = useInvalidateServiceAppointmentsQuery();
  const query = useQuery({
    enabled: hasReview,
    queryKey: ['staff-warranty-details', userId, appointmentId],
    queryFn: async () => {
      const result = await getStaffWarrantyDetailsAction(appointmentId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    retry: false,
  });
  async function startReview() {
    if (saving) return;
    setSaving(true);
    setFeedback('');
    try {
      const result = await startStaffWarrantyReviewAction(appointmentId);
      if (!result.success) {
        setFeedback(result.error);
        return;
      }
      setStarted(true);
      void invalidate();
    } catch {
      setFeedback('Could not start the review. Try again to check the current record.');
    } finally {
      setSaving(false);
    }
  }

  if (!hasReview) {
    return (
      <section className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" className="min-h-11" loading={saving} onClick={() => void startReview()}>
          Start warranty review
        </Button>
        {feedback && <p role="alert" className="text-sm text-destructive">{feedback}</p>}
      </section>
    );
  }

  const details = query.data;
  if (query.isPending) return <p role="status" className="text-sm text-muted-foreground">Loading warranty assessment...</p>;
  if (!details) return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <p role="alert">Warranty assessment could not be loaded.</p>
      <Button type="button" variant="outline" onClick={() => void query.refetch()}>Retry</Button>
    </div>
  );
  const canReview = canStartStaffWarrantyReview(status) && !details.replacement_serial;
  const canLink = !details.unit_id && (details.decision === 'under_review' || details.decision === 'further_review');

  function open(next: Mode) {
    setFeedback('');
    setMode(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode || saving) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setSaving(true);
    setFeedback('');
    try {
      const result = await saveStaffWarrantyAction({ ...data, kind: mode, appointmentId });
      setFailed(!result.success);
      if (!result.success) {
        setFeedback(result.error);
        return;
      }
      setMode(null);
      setFeedback('Warranty assessment updated.');
      await query.refetch();
    } catch {
      setFailed(true);
      setFeedback('Could not save the assessment. Check the current record before retrying.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <WarrantySummary details={details} />
      {details.decision === 'replacement_approved' && (
        <StaffWarrantyExchange appointmentId={appointmentId} userId={userId} originalSerial={details.original_serial} existingHandover={Boolean(details.replacement_handover_on)}
          onChanged={() => void query.refetch()} />
      )}
      <div className="flex flex-wrap gap-2">
        {canLink && <Button type="button" variant="outline" className="min-h-11" disabled={saving} onClick={() => open('link')}>Verify purchased bike</Button>}
        {canReview && <Button type="button" variant="outline" className="min-h-11" disabled={saving} onClick={() => open('review')}>Record decision</Button>}
      </div>
      {mode && (
        <form key={mode} onSubmit={submit} className="space-y-3 rounded-xl border p-4">
          {mode === 'review' ? (
            <>
              <Select name="decision" label="Warranty decision" className="min-h-11" required>
                {decisions.filter((decision) => decision !== 'replacement_approved' || details.unit_id)
                  .map((decision) => <option key={decision} value={decision}>{warrantyDecisions[decision]}</option>)}
              </Select>
              {!details.unit_id && <p className="text-sm text-muted-foreground">Verify the purchased bike before approving a replacement.</p>}
              <Textarea name="note" label="Decision and charges" helperText="Explain the finding and any charges. The customer can see this note." required maxLength={1500} />
            </>
          ) : (
            <Input name="serial" label="Original serial number"
              defaultValue={details.original_serial ?? ''} required maxLength={100} />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="min-h-11" loading={saving}>Save</Button>
            <Button type="button" variant="outline" className="min-h-11" disabled={saving} onClick={() => setMode(null)}>Discard</Button>
          </div>
        </form>
      )}
      {feedback && <p role={failed ? 'alert' : 'status'} className={failed ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{feedback}</p>}
    </div>
  );
}
