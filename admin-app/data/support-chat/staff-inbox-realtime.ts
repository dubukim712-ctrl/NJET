'use client';

import { createClient } from '@/data/supabase/client';

type InboxEvent = 'changed' | 'connected' | 'offline';
type Listener = (event: InboxEvent) => void;

const listeners = new Set<Listener>();
let connection: 'connected' | 'offline' | undefined;
let disconnect: (() => Promise<void>) | undefined;
let closing: Promise<void> | undefined;

function publish(event: InboxEvent) {
  listeners.forEach((listener) => listener(event));
}

function connect() {
  if (disconnect || closing || !listeners.size) return;

  const supabase = createClient();
  let active = true;
  const channel = supabase
    .channel('support-chat:staff-inbox', { config: { private: true } })
    .on('broadcast', { event: 'chat_changed' }, () => {
      if (active) publish('changed');
    });

  disconnect = async () => {
    active = false;
    connection = undefined;
    await supabase.removeChannel(channel);
  };
  channel.subscribe((status) => {
    if (!active) return;
    if (status === 'SUBSCRIBED') {
      connection = 'connected';
      publish('connected');
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      connection = 'offline';
      publish('offline');
    }
  });
}

export function subscribeStaffChatInbox(listener: Listener) {
  listeners.add(listener);
  connect();
  if (connection) listener(connection);

  return () => {
    listeners.delete(listener);
    if (!listeners.size && disconnect) {
      closing = disconnect().finally(() => {
        closing = undefined;
        connect();
      });
      disconnect = undefined;
    }
  };
}
