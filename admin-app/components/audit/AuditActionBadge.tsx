import { capitalize } from '@/lib/audit';
import { cn } from '@/lib/utils';

const STYLES: Record<string, string> = {
  insert: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  update: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  delete: 'bg-red-500/10 text-red-700 dark:text-red-400',
  clear: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

export function AuditActionBadge({ action }: { action: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STYLES[action] ?? 'bg-muted text-muted-foreground'
      )}
    >
      {capitalize(action)}
    </span>
  );
}
