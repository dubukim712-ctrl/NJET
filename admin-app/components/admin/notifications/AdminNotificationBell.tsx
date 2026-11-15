'use client';

import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { NotificationList } from '@/components/admin/notifications/NotificationList';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  useAdminNotificationActions,
  useAdminNotifications,
} from '@/data/notifications/use-admin-notifications';

export function AdminNotificationBell({ userId }: { userId: string }) {
  const query = useAdminNotifications(userId, true, 6);
  const actions = useAdminNotificationActions(userId);
  const unreadCount = query.data?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-5 text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="flex max-h-[calc(100dvh-5rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden p-0"
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <DropdownMenuItem asChild className="h-auto cursor-pointer p-0">
              <button
                type="button"
                onClick={() => void actions.markAllRead()}
                disabled={query.isPending}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            </DropdownMenuItem>
          )}
        </div>

        {actions.error && (
          <p role="alert" className="px-4 py-2 text-sm text-destructive">
            {actions.error}
          </p>
        )}
        {query.isPending ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading notifications...
          </p>
        ) : query.isError ? (
          <div className="space-y-2 px-4 py-6 text-center">
            <p className="text-sm text-destructive">Could not load notifications.</p>
            <DropdownMenuItem asChild className="justify-center">
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="text-sm font-medium text-primary hover:underline"
              >
                Try again
              </button>
            </DropdownMenuItem>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NotificationList
              compact
              notifications={query.data.notifications}
              onMarkRead={(id) => void actions.markRead(id)}
            />
          </div>
        )}

        <div className="border-t p-2">
          <DropdownMenuItem asChild className="justify-center font-medium">
            <Link href="/admin/notifications">View all notifications</Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
