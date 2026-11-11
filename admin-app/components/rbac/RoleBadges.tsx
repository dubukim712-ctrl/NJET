import { cn } from '@/lib/utils';
import type { RoleScope } from '@/types/database';

interface RoleBadgesProps {
  scope: RoleScope;
  isFullAccess?: boolean;
  isSystem?: boolean;
}

const STYLES = {
  fullAccess: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  staff: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  customer: 'bg-green-500/10 text-green-700 dark:text-green-400',
  system: 'bg-muted text-muted-foreground',
};

export function RoleBadges({
  scope,
  isFullAccess = false,
  isSystem = false,
}: RoleBadgesProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isFullAccess && (
        <span
          className={cn(
            'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium',
            STYLES.fullAccess
          )}
        >
          Full access
        </span>
      )}
      <span
        className={cn(
          'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium',
          scope === 'customer' ? STYLES.customer : STYLES.staff
        )}
      >
        {scope === 'customer' ? 'Customer' : 'Staff'}
      </span>
      {isSystem && (
        <span
          className={cn(
            'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium',
            STYLES.system
          )}
        >
          System
        </span>
      )}
    </div>
  );
}
