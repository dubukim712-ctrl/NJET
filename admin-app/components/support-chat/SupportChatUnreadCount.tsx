'use client';

import { useEffect, useState } from 'react';
import { getSupportChatUnreadCountAction } from '@/data/actions/support-chat';
import { createClient } from '@/data/supabase/client';

interface SupportChatUnreadCountProps {
  userId: string | null;
  compact?: boolean;
}

export function SupportChatUnreadCount({
  userId,
  compact = false,
}: SupportChatUnreadCountProps) {
  const [count, setCount] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    const supabase = createClient();
    const refresh = async () => {
      try {
        const result = await getSupportChatUnreadCountAction();
        if (!active) return;
        if (!result.success) {
          setHasError(true);
          return;
        }
        setCount(result.data);
        setHasError(false);
      } catch {
        if (active) setHasError(true);
      }
    };
    const startPolling = () => {
      if (!pollTimer) pollTimer = setInterval(() => void refresh(), 30_000);
    };
    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = undefined;
    };

    void refresh();
    const channel = supabase
      .channel('support-chat:staff-inbox', { config: { private: true } })
      .on('broadcast', { event: 'chat_changed' }, () => {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => void refresh(), 200);
      })
      .subscribe((state) => {
        if (!active) return;
        if (state === 'SUBSCRIBED') {
          stopPolling();
          void refresh();
        } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
          startPolling();
        }
      });

    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      stopPolling();
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  if ((count === null || count === 0) && !hasError) return null;

  const label = hasError
    ? 'Unread conversations could not be refreshed'
    : `${count} unread ${count === 1 ? 'conversation' : 'conversations'}`;

  return (
    <span
      aria-label={label}
      aria-live="polite"
      aria-atomic="true"
      title={label}
      className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
        compact
          ? 'absolute right-0 top-0'
          : 'ml-auto'
      } ${
        hasError
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-primary text-primary-foreground'
      }`}
    >
      {hasError ? '!' : count !== null && count > 99 ? '99+' : count}
    </span>
  );
}
