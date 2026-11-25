'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { recordWarrantyReturnAction } from '@/data/actions/warranty-returns';
import { formatWarrantyTimestamp } from '@/lib/service-warranty';
import { returnDispositions, returnReasons } from '@/lib/warranty-returns';
import type { WarrantyReturn, WarrantyReturnSaved } from '@/types/service-warranty';

export function WarrantyReturnCard({ row, onSaved }: {
  row: WarrantyReturn;
  onSaved: (saved: WarrantyReturnSaved) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const [previousId, setPreviousId] = useState(row.update_id);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setFeedback(null);
    try {
      const result = await recordWarrantyReturnAction({
        appointmentId: row.appointment_id, previousId,
        reason: form.get('reason'), disposition: form.get('disposition'), note: form.get('note'),
      });
      if (!result.success) {
        setFeedback({ error: true, message: result.error });
        return;
      }
      setEditing(false);
      setFeedback({ error: false, message: 'Return update saved.' });
      onSaved(result.data);
    } catch {
      setFeedback({ error: true, message: 'Could not confirm the update. Refresh the list before trying again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words font-semibold">{row.product_name}</h3>
          <p className="break-words text-sm text-muted-foreground">{row.original_serial} / {row.branch_name}</p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-sm">{returnDispositions[row.disposition ?? 'held_at_branch']}</span>
      </header>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Received</dt><dd>{formatWarrantyTimestamp(row.received_at)}</dd></div>
        <div><dt className="text-muted-foreground">Return reason</dt><dd>{returnReasons[row.reason ?? 'awaiting_inspection']}</dd></div>
        <div><dt className="text-muted-foreground">Condition at return</dt><dd className="whitespace-pre-wrap break-words">{row.returned_condition}</dd></div>
        {row.note && <div><dt className="text-muted-foreground">Latest staff note</dt><dd className="whitespace-pre-wrap break-words">{row.note}</dd></div>}
      </dl>
      {row.recorded_at && <p className="text-sm text-muted-foreground">Updated {formatWarrantyTimestamp(row.recorded_at)}{row.recorded_by && ` by ${row.recorded_by}`}</p>}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="min-h-11">
          <Link href={`/admin/appointments?q=${encodeURIComponent(row.appointment_number)}`}>{row.appointment_number}</Link>
        </Button>
        {!editing && <Button type="button" className="min-h-11" disabled={saving} onClick={() => {
          setPreviousId(row.update_id);
          setFeedback(null);
          setEditing(true);
        }}>Update return</Button>}
      </div>
      {editing && (
        <form className="space-y-3 border-t pt-4" onSubmit={save}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select name="reason" label="Return reason" defaultValue={row.reason ?? 'awaiting_inspection'} disabled={saving} className="min-h-11">
              {Object.entries(returnReasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Select name="disposition" label="Disposition" defaultValue={row.disposition ?? 'held_at_branch'} disabled={saving} className="min-h-11">
              {Object.entries(returnDispositions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </div>
          <Textarea name="note" label="Staff note (optional)" defaultValue={row.note ?? ''} maxLength={1000} disabled={saving} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={saving} className="min-h-11">Save return update</Button>
            <Button type="button" variant="outline" disabled={saving} className="min-h-11" onClick={() => {
              setEditing(false);
              setFeedback(null);
            }}>Cancel</Button>
          </div>
        </form>
      )}
      {feedback && <p role={feedback.error ? 'alert' : 'status'} className={feedback.error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{feedback.message}</p>}
    </article>
  );
}
