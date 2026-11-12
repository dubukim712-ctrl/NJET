import { RealtimeStatus } from '@/components/realtime/RealtimeStatus';
import type { RealtimeConnectionState } from '@/types/realtime';

export function CustomerOrderPaymentSkeleton({
  realtimeState,
}: {
  realtimeState?: RealtimeConnectionState;
}) {
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        {realtimeState ? (
          <RealtimeStatus state={realtimeState} />
        ) : (
          <div className="h-7 w-44 animate-pulse rounded-full bg-muted" />
        )}
      </div>
      <div
        className="space-y-6"
        role="status"
        aria-label="Loading payment details"
        aria-busy="true"
      >
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <header className="space-y-2">
          <div className="h-3 w-36 animate-pulse rounded bg-muted" />
          <div className="h-9 w-56 animate-pulse rounded bg-muted" />
          <div className="h-5 w-64 max-w-full animate-pulse rounded bg-muted" />
        </header>

        <section className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="h-5 w-56 max-w-full animate-pulse rounded bg-amber-200 dark:bg-amber-900/50" />
          <div className="h-4 w-full max-w-xl animate-pulse rounded bg-amber-200 dark:bg-amber-900/50" />
          <div className="mt-3 h-8 w-40 animate-pulse rounded bg-amber-200 dark:bg-amber-900/50" />
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-7 w-full max-w-md animate-pulse rounded bg-muted" />
          </div>
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
            <div className="space-y-4">
              <div className="h-4 w-48 max-w-full animate-pulse rounded bg-muted" />
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="mx-auto aspect-square w-full max-w-48 animate-pulse rounded-md border bg-muted p-2" />
          </div>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
          <div className="space-y-2">
            <div className="h-4 w-44 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-44 animate-pulse rounded-md bg-muted" />
        </section>
      </div>
    </div>
  );
}
