import { formatAuditValue, getAuditFieldChanges } from '@/lib/audit';
import type { Json } from '@/types/database';

interface AuditChangesProps {
  action: string;
  oldData: Json | null;
  newData: Json | null;
}

export function AuditChanges({ action, oldData, newData }: AuditChangesProps) {
  const changes = getAuditFieldChanges(oldData, newData, action);

  if (changes.length === 0) {
    return (
      <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        No field changes were recorded for this entry.
      </p>
    );
  }

  return (
    <dl className="divide-y overflow-hidden rounded-xl border bg-card">
      {changes.map((change) => {
        const value =
          action === 'delete' || action === 'clear'
            ? change.oldValue
            : change.newValue;

        return (
          <div
            key={change.key}
            className="grid gap-1 p-4 sm:grid-cols-[10rem_1fr] sm:gap-4"
          >
            <dt className="text-sm font-medium">{change.label}</dt>
            <dd className="space-y-1 text-sm">
              {action === 'update' ? (
                <>
                  <p className="whitespace-pre-wrap break-words text-muted-foreground">
                    <span className="mr-1 font-mono text-destructive">−</span>
                    {formatAuditValue(change.oldValue, change.key)}
                  </p>
                  <p className="whitespace-pre-wrap break-words">
                    <span className="mr-1 font-mono text-emerald-600 dark:text-emerald-400">
                      +
                    </span>
                    {formatAuditValue(change.newValue, change.key)}
                  </p>
                </>
              ) : (
                <p className="whitespace-pre-wrap break-words">
                  {formatAuditValue(value, change.key)}
                </p>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
