'use client';

import Link from 'next/link';
import { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import type { AdminNotification } from '@/types/database';

const notificationDateFormat = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Manila',
});

export function NotificationList({
  notifications,
  onMarkRead,
  compact = false,
}: {
  notifications: AdminNotification[];
  onMarkRead: (id: string) => void;
  compact?: boolean;
}) {
  const visibleNotifications = compact ? notifications.slice(0, 6) : notifications;

  if (visibleNotifications.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        No notifications yet.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {visibleNotifications.map((notification) => {
        const link = (
          <Link
            href={notification.href}
            onClick={() => {
              if (!notification.read_at) onMarkRead(notification.id);
            }}
            className={`block px-4 py-3 transition-colors hover:bg-accent/60 ${
              notification.read_at ? '' : 'bg-primary/[0.04]'
            }`}
          >
            <div className="flex items-start gap-2">
              {!notification.read_at && (
                <span
                  aria-label="Unread"
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-sm font-semibold">{notification.title}</span>
                  {notification.resolved_at && (
                    <span className="text-xs text-muted-foreground">Resolved</span>
                  )}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {notification.message}
                </span>
                <time
                  dateTime={notification.created_at}
                  className="mt-1 block text-xs text-muted-foreground"
                >
                  {notificationDateFormat.format(new Date(notification.created_at))}
                </time>
              </span>
            </div>
          </Link>
        );

        return (
          <li key={notification.id}>
            {compact ? (
              <DropdownMenuItem
                asChild
                className="h-auto cursor-pointer p-0 focus:bg-accent/60"
              >
                {link}
              </DropdownMenuItem>
            ) : (
              link
            )}
          </li>
        );
      })}
    </ul>
  );
}
