'use client';

import { CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { NotificationList } from '@/components/admin/notifications/NotificationList';
import { getAdminNotificationsAction } from '@/data/actions/admin-notifications';
import {
  useAdminNotificationActions,
  useAdminNotifications,
} from '@/data/notifications/use-admin-notifications';
import type { AdminNotification } from '@/types/database';

export function AdminNotificationsPage({ userId }: { userId: string }) {
  const query = useAdminNotifications(userId, false);
  const actions = useAdminNotificationActions(userId);
  const [olderNotifications, setOlderNotifications] = useState<AdminNotification[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const notifications = [...(query.data?.notifications ?? []), ...olderNotifications];
  const hasMore = hasMoreOlder ?? query.data?.hasMore ?? false;

  const loadMore = async () => {
    const lastNotification = notifications[notifications.length - 1];
    const cursor = lastNotification
      ? { created_at: lastNotification.created_at, id: lastNotification.id }
      : null;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setHistoryError(null);
    try {
      const result = await getAdminNotificationsAction({ before: cursor, limit: 50 });
      if (!result.success) {
        setHistoryError(result.error);
        return;
      }
      const existingIds = new Set(notifications.map((notification) => notification.id));
      setOlderNotifications((current) => [
        ...current,
        ...result.data.notifications.filter((notification) => !existingIds.has(notification.id)),
      ]);
      setHasMoreOlder(result.data.hasMore);
    } catch (error) {
      console.error('Could not load older notifications.', error);
      setHistoryError('Could not load older notifications. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  const markRead = async (id: string) => {
    if (await actions.markRead(id)) {
      setOlderNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, read_at: notification.read_at ?? new Date().toISOString() }
            : notification
        )
      );
    }
  };

  const markAllRead = async () => {
    if (await actions.markAllRead()) {
      const readAt = new Date().toISOString();
      setOlderNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read_at: notification.read_at ?? readAt,
        }))
      );
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Admin portal
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Orders, service assignments, and branch inventory alerts.
          </p>
        </div>
        {(query.data?.unreadCount ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={query.isPending}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Mark all as read
          </button>
        )}
      </header>

      {actions.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {actions.error}
        </p>
      )}
      {historyError && (
        <p role="alert" className="text-sm text-destructive">
          {historyError}
        </p>
      )}
      {query.isPending ? (
        <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Loading notifications...
        </p>
      ) : query.isError ? (
        <div className="space-y-3 rounded-lg border p-8 text-center">
          <p className="text-sm text-destructive">Could not load notifications.</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="text-sm font-medium text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <NotificationList
            notifications={notifications}
            onMarkRead={(id) => void markRead(id)}
          />
        </div>
      )}
      {!query.isPending && !query.isError && hasMore && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="min-h-10 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load older notifications'}
          </button>
        </div>
      )}
    </section>
  );
}
