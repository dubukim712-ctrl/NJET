import { RealtimeStatus } from '@/components/realtime/RealtimeStatus';
import type { RealtimeConnectionState } from '@/types/realtime';

const APPOINTMENTS = ['first', 'second'] as const;

export function CustomerServiceAppointmentsSkeleton({
  realtimeState,
}: {
  realtimeState?: RealtimeConnectionState;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {realtimeState ? (
          <RealtimeStatus state={realtimeState} />
        ) : (
          <div className="h-7 w-44 animate-pulse rounded-full bg-muted" />
        )}
      </div>
      <div
        className="space-y-4"
        role="status"
        aria-label="Loading appointments"
        aria-busy="true"
      >
        {APPOINTMENTS.map((appointment) => (
          <div
            key={appointment}
            className="rounded-xl border bg-card p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="h-5 w-36 animate-pulse rounded bg-muted" />
                <div className="h-4 w-48 max-w-full animate-pulse rounded bg-muted" />
              </div>
              <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-36 animate-pulse rounded bg-muted" />
              <div className="h-4 w-44 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-4 h-10 w-40 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
