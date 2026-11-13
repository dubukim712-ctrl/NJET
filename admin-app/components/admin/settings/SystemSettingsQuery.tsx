'use client';

import { SystemSettingsManager } from '@/components/admin/settings/SystemSettingsManager';
import { SystemSettingsLoadingSkeleton } from '@/components/admin/settings/SystemSettingsLoadingSkeleton';
import { Button } from '@/components/ui/Button';
import {
  AdminSystemSettingsQueryError,
  useAdminSystemSettingsQuery,
} from '@/data/commerce/admin-system-settings-client';

export function SystemSettingsQuery({ userId }: { userId: string }) {
  const query = useAdminSystemSettingsQuery(userId);

  if (!query.data && query.isPending) {
    return <SystemSettingsLoadingSkeleton />;
  }

  if (!query.data) {
    return (
      <section
        className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5"
        role="alert"
      >
        <div>
          <h2 className="font-semibold">Settings are unavailable</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {query.error instanceof AdminSystemSettingsQueryError
              ? query.error.message
              : 'System settings could not be loaded. Please try again.'}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
          Try again
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {query.isError && (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert"
        >
          Could not refresh settings. The cached settings are still shown.
        </p>
      )}
      <SystemSettingsManager settings={query.data} />
    </div>
  );
}
