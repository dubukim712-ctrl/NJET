import type { RealtimeConnectionState } from '@/types/realtime';

const LABELS: Record<RealtimeConnectionState, string> = {
  connecting: 'Connecting live updates',
  connected: 'Live updates connected',
  disconnected: 'Live updates unavailable; refresh page to update',
  idle: 'No live updates available',
};

export function RealtimeStatus({ state }: { state: RealtimeConnectionState }) {
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <span
      role="status"
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        state === 'connected'
          ? 'bg-emerald-100 text-emerald-900'
          : state === 'disconnected'
            ? 'bg-amber-100 text-amber-950'
            : 'bg-secondary text-secondary-foreground'
      }`}
    >
      {LABELS[state]}
    </span>
  );
}
