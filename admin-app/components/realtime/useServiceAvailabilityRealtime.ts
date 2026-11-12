'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/data/supabase/client';
import type { RealtimeConnectionState } from '@/types/realtime';

export function useServiceAvailabilityRealtime(
  branchId: string,
  onChange: () => void
) {
  const [connection, setConnection] = useState<{
    branchId: string;
    state: RealtimeConnectionState;
  }>({ branchId: '', state: 'idle' });
  const currentConnection = !branchId
    ? 'idle'
    : connection.branchId === branchId
      ? connection.state
      : 'connecting';

  useEffect(() => {
    if (!branchId) return;
    const supabase = createClient();
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`service-availability:${branchId}`, { config: { private: true } })
      .on('broadcast', { event: 'availability_changed' }, () => {
        if (!active) return;
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(onChange, 200);
      })
      .subscribe((status) => {
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          setConnection({ branchId, state: 'connected' });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnection({ branchId, state: 'disconnected' });
        }
      });

    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [branchId, onChange]);

  return currentConnection;
}
