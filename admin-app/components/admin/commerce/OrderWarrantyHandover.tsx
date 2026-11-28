'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { getOrderWarrantyUnitsAction, recordWarrantyHandoverAction } from '@/data/actions/service-warranty';
import { formatWarrantyDate } from '@/lib/service-warranty';

export function OrderWarrantyHandover({ orderId, showHandover, receiptAction }: {
  orderId: string;
  showHandover: boolean;
  receiptAction: ReactNode;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const query = useQuery({
    queryKey: ['order-warranty-handovers', user?.id, orderId],
    enabled: showHandover && open && Boolean(user),
    retry: false,
    queryFn: async () => {
      const result = await getOrderWarrantyUnitsAction(orderId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
  const units = query.data ?? [];
  const pending = units.filter((unit) => !unit.handover_on);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setSaving(true);
    setFeedback('');
    try {
      const result = await recordWarrantyHandoverAction({ ...fields, orderId });
      setFailed(!result.success);
      setFeedback(result.success ? 'Verified handover recorded.' : result.error);
      if (result.success) await query.refetch();
    } catch {
      setFailed(true);
      setFeedback('Could not record the handover. Check the current record before retrying.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {showHandover && open && (
        <div className="space-y-3">
          {query.isPending && <p role="status" className="text-sm text-muted-foreground">Loading purchased bikes...</p>}
          {query.isError && (
            <div className="flex flex-wrap items-center gap-2">
              <p role="alert" className="text-sm text-destructive">Could not load handovers.</p>
              <Button type="button" variant="outline" onClick={() => void query.refetch()}>Retry</Button>
            </div>
          )}
          {query.data && !units.length && <p className="text-sm text-muted-foreground">No serialized bikes are assigned to this completed order.</p>}
          {units.filter((unit) => unit.handover_on).map((unit) => (
            <p key={unit.unit_id} className="break-words text-sm">{unit.model} / {unit.serial} / {unit.wheel_count} wheels / {formatWarrantyDate(unit.handover_on!)}</p>
          ))}
          {pending.length > 0 && (
            <form key={pending.map((unit) => unit.unit_id).join(':')} onSubmit={submit} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
              <p className="text-sm text-muted-foreground sm:col-span-2">Record the date the buyer actually received the unit. Verify the serial and wheel count before saving.</p>
              <Select name="unitId" label="Purchased bike" className="min-h-11" required>
                {pending.map((unit) => <option key={unit.unit_id} value={unit.unit_id}>{unit.model} / {unit.serial}</option>)}
              </Select>
              <Select name="wheelCount" label="Verified wheel count" className="min-h-11" required>
                <option value="">Choose wheel count</option>
                {[2, 3, 4].map((count) => <option key={count} value={count}>{count} wheels</option>)}
              </Select>
              <DatePicker name="handoverOn" label="Actual handover date" required />
              <div className="self-end"><Button type="submit" className="min-h-11" loading={saving}>Record handover</Button></div>
            </form>
          )}
          {feedback && <p role={failed ? 'alert' : 'status'} className={failed ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{feedback}</p>}
        </div>
      )}
      <footer className="mt-4 flex flex-col-reverse gap-2.5 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
        {showHandover && (
          <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" aria-expanded={open} disabled={saving} onClick={() => setOpen((value) => !value)}>
            {open ? 'Hide warranty handovers' : 'Warranty handovers'}
          </Button>
        )}
        {receiptAction}
      </footer>
    </>
  );
}
