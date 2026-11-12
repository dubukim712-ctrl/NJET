'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/data/supabase/client';
import type { RealtimeConnectionState, RealtimeTable } from '@/types/realtime';

export function useRealtimeChanges(
  channelName: string,
  tables: readonly RealtimeTable[],
  onChange: () => void
) {
  const tableKey = tables.join(',');
  const subscriptionKey = `${channelName}:${tableKey}`;
  const [connection, setConnection] = useState<{
    key: string;
    state: RealtimeConnectionState;
  }>({ key: '', state: 'connecting' });
  const currentConnection = !tableKey
    ? 'idle'
    : connection.key === subscriptionKey
      ? connection.state
      : 'connecting';

  useEffect(() => {
    if (!tableKey) return;
    const supabase = createClient();
    const watchedTables = tableKey.split(',').filter(isRealtimeTable);
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let channel = supabase.channel(channelName);
    const scheduleChange = () => {
      if (!active) return;
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(onChange, 200);
    };

    for (const table of watchedTables) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        scheduleChange
      );
    }

    channel.subscribe((status) => {
      if (!active) return;
      if (status === 'SUBSCRIBED') {
        setConnection({ key: subscriptionKey, state: 'connected' });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setConnection({ key: subscriptionKey, state: 'disconnected' });
      }
    });

    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [channelName, onChange, subscriptionKey, tableKey]);

  return currentConnection;
}

function isRealtimeTable(value: string): value is RealtimeTable {
  return [
    'orders',
    'order_items',
    'order_home_credit_details',
    'order_documents',
    'order_invoices',
    'order_certificates',
    'payment_recipients',
    'service_appointments',
    'branch_inventory',
    'product_variants',
    'products',
    'users',
    'roles',
    'branches',
    'service_appointment_internal_notes',
    'service_appointment_cancellation_requests',
    'service_appointment_closures',
    'product_categories',
    'product_subcategories',
    'ebike_units',
    'inventory_movements',
    'branch_transfers',
    'branch_transfer_items',
    'branch_transfer_units',
  ].includes(value);
}
