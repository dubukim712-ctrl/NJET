'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/data/supabase/client';
import type { RealtimeConnectionState } from '@/types/realtime';

export function useCustomerServiceAppointmentsRealtime(
  userId: string,
  onChange: () => void
) {
  const topic = `customer-service-appointments:${userId}`;
  const [connection, setConnection] = useState<{
    topic: string;
    state: RealtimeConnectionState;
  }>({ topic: '', state: 'connecting' });
  const currentConnection = !userId
    ? 'idle'
    : connection.topic === topic
      ? connection.state
      : 'connecting';

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleChange = () => {
      if (!active) return;
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(onChange, 200);
    };
    const channel = supabase
      .channel(topic, { config: { private: true } })
      .on('broadcast', { event: 'appointment_changed' }, scheduleChange)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_appointment_cancellation_requests',
          filter: `customer_id=eq.${userId}`,
        },
        scheduleChange
      )
      .subscribe((status) => {
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          setConnection({ topic, state: 'connected' });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnection({ topic, state: 'disconnected' });
        }
      });

    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [onChange, topic, userId]);

  return currentConnection;
}
