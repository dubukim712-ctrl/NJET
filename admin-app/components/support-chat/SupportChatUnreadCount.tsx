'use client';

import { useEffect, useState } from 'react';
import { getSupportChatUnreadCountAction } from '@/data/actions/support-chat';
import { subscribeStaffChatInbox } from '@/data/support-chat/staff-inbox-realtime';

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
    let refreshId = 0;
    const refresh = async () => {
      const id = ++refreshId;
      try {
        const result = await getSupportChatUnreadCountAction();
        if (!active || id !== refreshId) return;
        if (!result.success) {
          setHasError(true);
          return;
        }
        setCount(result.data);
        setHasError(false);
      } catch {
        if (active && id === refreshId) setHasError(true);
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
    const unsubscribe = subscribeStaffChatInbox((event) => {
      if (event === 'offline') {
        startPolling();
        return;
      }
      if (event === 'connected') stopPolling();
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void refresh(), 200);
    });

    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      stopPolling();
      unsubscribe();
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
