'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { warrantyReservationChanged } from '@/lib/service-warranty';
import { getStaffWarrantyExchangeAction, manageWarrantyExchangeAction } from '@/data/actions/warranty-exchange';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
import { useInvalidateInventoryValuationQuery } from '@/data/commerce/inventory-valuation-client';
import { formatWarrantyDate, formatWarrantyTimestamp } from '@/lib/service-warranty';
import type { WarrantyExchangeOperation } from '@/types/service-warranty';

type ExchangeCommand = { operation: WarrantyExchangeOperation; [field: string]: unknown };

export function StaffWarrantyExchange({ appointmentId, userId, originalSerial, existingHandover, onChanged }: {
  appointmentId: string;
  userId: string;
  originalSerial: string | null;
  existingHandover: boolean;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const [confirmation, setConfirmation] = useState<ExchangeCommand | null>(null);
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const invalidateValuation = useInvalidateInventoryValuationQuery();
  const query = useQuery({
    queryKey: ['staff-warranty-exchange', userId, appointmentId],
    retry: false,
    queryFn: async () => {
      const result = await getStaffWarrantyExchangeAction(appointmentId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });

  async function run(command: ExchangeCommand) {
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await manageWarrantyExchangeAction({ ...command, appointmentId });
      if (!result.success) {
        setFeedback({ error: true, message: result.error });
        if (result.error === warrantyReservationChanged) {
          setConfirmation(null);
          await query.refetch();
        }
        return;
      }
      setConfirmation(null);
      setFeedback({ error: false, message: 'Exchange updated.' });
      const changesStock = command.operation === 'reserve' || command.operation === 'release';
      await Promise.all([
        query.refetch(),
        invalidateProducts(changesStock ? 'inventory' : 'admin'),
        ...(changesStock ? [invalidateValuation()] : []),
      ]);
      onChanged();
    } catch {
      setFeedback({ error: true, message: 'Could not save the exchange. Check the latest record before trying again.' });
    } finally {
      setSaving(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>, operation: WarrantyExchangeOperation) {
    event.preventDefault();
    const command = { ...Object.fromEntries(new FormData(event.currentTarget)), operation };
    if (operation === 'handover') {
      setFeedback(null);
      setConfirmation({
        ...command,
        expectedReplacementUnitId: query.data?.exchange?.replacement_unit_id,
        expectedReservationToken: query.data?.exchange?.reservation_token,
      });
    } else void run(command);
  }

  if (query.isPending) return <p role="status" className="text-sm text-muted-foreground">Loading warranty exchange...</p>;
  if (!query.data) return (
    <div className="flex flex-wrap items-center gap-2">
      <p role="alert" className="text-sm text-destructive">Could not load the exchange.</p>
      <Button type="button" variant="outline" className="min-h-11" onClick={() => void query.refetch()}>Retry</Button>
    </div>
  );
  const { exchange, options, canProcess } = query.data;

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h3 className="font-semibold">Warranty exchange</h3>
      {exchange && (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Original unit received</dt><dd>{formatWarrantyTimestamp(exchange.received_at)}</dd></div>
          <div><dt className="text-muted-foreground">Returned condition</dt><dd className="whitespace-pre-wrap break-words">{exchange.returned_condition}</dd></div>
          {exchange.replacement_serial && <div><dt className="text-muted-foreground">Replacement serial</dt><dd className="break-words">{exchange.replacement_serial}</dd></div>}
          {exchange.replacement_handover_on && <div><dt className="text-muted-foreground">Handover date</dt><dd>{formatWarrantyDate(exchange.replacement_handover_on)}</dd></div>}
        </dl>
      )}
      {exchange?.completed_at ? (
        <p className="text-sm font-medium">Replacement handed over. The original unit remains outside sellable stock.</p>
      ) : !exchange && existingHandover ? (
        <p className="text-sm text-muted-foreground">This replacement handover was recorded manually.</p>
      ) : !canProcess ? (
        <p className="text-sm text-muted-foreground">Staff with service and inventory permissions can process this exchange.</p>
      ) : !exchange ? (
        <form key="receive" onSubmit={(event) => submit(event, 'receive')} className="space-y-3">
          <p className="text-sm text-muted-foreground">Receive the original unit and keep it separate from sellable stock.</p>
          <Input name="originalSerial" label="Confirm original serial" helperText={originalSerial ? 'Expected serial: ' + originalSerial : undefined}
            maxLength={100} required disabled={saving} />
          <Textarea name="value" label="Returned condition" maxLength={1500} required disabled={saving} />
          <Button type="submit" className="min-h-11" loading={saving}>Receive original unit</Button>
        </form>
      ) : !exchange.replacement_serial ? (
        <form key="reserve" onSubmit={(event) => submit(event, 'reserve')} className="space-y-3">
          {options.length ? (
            <>
              <Select name="value" label="Available replacement serial" className="min-h-11" required disabled={saving}>
                <option value="">Choose a serial</option>
                {options.map(({ serial, motor }) => <option key={serial} value={serial}>{serial} / {motor}</option>)}
              </Select>
              <Button type="submit" className="min-h-11" loading={saving}>Reserve replacement</Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No sellable units of this variant are available at the branch.</p>
          )}
        </form>
      ) : (
        <form key={exchange.reservation_token} onSubmit={(event) => submit(event, 'handover')} className="space-y-3">
          <DatePicker name="handoverOn" label="Actual replacement handover date" required disabled={saving} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="min-h-11" loading={saving}>Complete handover</Button>
            <Button type="button" variant="outline" className="min-h-11" disabled={saving} onClick={() => {
              setFeedback(null);
              setConfirmation({
                operation: 'release',
                expectedReplacementUnitId: exchange.replacement_unit_id,
                expectedReservationToken: exchange.reservation_token,
              });
            }}>Release reservation</Button>
          </div>
          <p className="text-sm text-muted-foreground">Confirm any warranty terms for the replacement separately.</p>
        </form>
      )}
      {!confirmation && feedback && <p role={feedback.error ? 'alert' : 'status'} className={feedback.error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{feedback.message}</p>}
      <ConfirmDialog open={confirmation !== null} onOpenChange={(open) => { if (!open) setConfirmation(null); }}
        title={confirmation?.operation === 'release' ? 'Release this reservation?' : 'Complete replacement handover?'}
        description={confirmation?.operation === 'release'
          ? 'The reserved replacement will return to sellable stock. The original unit stays received.'
          : 'This records the replacement serial under the customer and issues the exchange record.'}
        confirmLabel={confirmation?.operation === 'release' ? 'Release reservation' : 'Complete handover'}
        loading={saving} error={feedback?.error ? feedback.message : null}
        onConfirm={() => { if (confirmation) void run(confirmation); }} />
    </section>
  );
}
