'use client';

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminNotificationsAction,
  markAdminNotificationReadAction,
  markAllAdminNotificationsReadAction,
} from '@/data/actions/admin-notifications';
import { useRealtimeChanges } from '@/components/realtime/useRealtimeChanges';

const notificationsQueryPrefix = (userId: string) =>
  ['admin-notifications', userId] as const;

export function useAdminNotifications(
  userId: string,
  subscribeRealtime = true,
  limit = 50
) {
  const queryClient = useQueryClient();
  const queryKey = [...notificationsQueryPrefix(userId), limit] as const;
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: notificationsQueryPrefix(userId),
    });
  }, [queryClient, userId]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await getAdminNotificationsAction({ limit });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  useRealtimeChanges(
    `admin-notifications-${userId}`,
    subscribeRealtime ? ['notifications'] : [],
    refresh
  );
  return query;
}

export function useAdminNotificationActions(userId: string) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    setError(null);
    try {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? 'Could not update notifications.');
        return false;
      }
      await queryClient.invalidateQueries({
        queryKey: notificationsQueryPrefix(userId),
      });
      return true;
    } catch (caught) {
      console.error('Could not update notifications.', caught);
      setError('Could not update notifications. Please try again.');
      return false;
    }
  };

  return {
    error,
    markRead: (notificationId: string) =>
      run(() => markAdminNotificationReadAction(notificationId)),
    markAllRead: () => run(markAllAdminNotificationsReadAction),
  };
}
