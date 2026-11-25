import { formatWarrantyDate, formatWarrantyTimestamp, warrantyDecisions, warrantyTiming } from '@/lib/service-warranty';
import type { WarrantyDetails } from '@/types/service-warranty';

export function WarrantySummary({ details, inspectionConfirmed = false }: {
  details: WarrantyDetails; inspectionConfirmed?: boolean;
}) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Warranty assessment</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {details.replacement_handover_on ? 'Replacement handed over' : warrantyDecisions[details.decision]}
        </span>
      </div>
      {inspectionConfirmed && (
        <p className="text-sm"><span className="font-medium">Inspection confirmed.</span>{' '}
          {details.decision === 'under_review' && 'Warranty coverage is under review.'}</p>
      )}
      <p className="text-sm font-medium">{warrantyTiming[details.timing]}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Request submitted</dt><dd>{formatWarrantyTimestamp(details.submitted_at)} (Philippine time)</dd></div>
        {details.order_number && <div><dt className="text-muted-foreground">Original order</dt><dd>{details.order_number}</dd></div>}
        {details.original_serial && <div><dt className="text-muted-foreground">Original serial</dt><dd className="break-words">{details.original_serial}</dd></div>}
        {details.handover_on && <div><dt className="text-muted-foreground">Original handover</dt><dd>{formatWarrantyDate(details.handover_on)}</dd></div>}
        {details.wheel_count && <div><dt className="text-muted-foreground">Verified wheel count</dt><dd>{details.wheel_count} wheels</dd></div>}
        {details.deadline && <div><dt className="text-muted-foreground">Standard request deadline</dt><dd>{formatWarrantyDate(details.deadline)}</dd></div>}
        {details.approver && details.decided_at && <div><dt className="text-muted-foreground">Decision recorded by</dt><dd>{details.approver} / {formatWarrantyTimestamp(details.decided_at)}</dd></div>}
        {details.replacement_serial && details.replacement_handover_on && (
          <div><dt className="text-muted-foreground">Replacement handover</dt>
            <dd className="break-words">{details.replacement_serial} / {formatWarrantyDate(details.replacement_handover_on)}</dd></div>
        )}
      </dl>
      {details.decision_note && <p className="whitespace-pre-wrap break-words text-sm">{details.decision_note}</p>}
      {details.decision === 'replacement_approved' && !details.replacement_handover_on && (
        <p className="text-sm text-muted-foreground">Awaiting replacement handover.</p>
      )}
    </section>
  );
}
