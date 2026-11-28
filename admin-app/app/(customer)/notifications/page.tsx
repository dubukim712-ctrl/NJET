import { Bell } from 'lucide-react';
import { EmptyState } from '@/components/layout/EmptyState';

export const metadata = { title: 'Notifications' };

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stay up to date with activity in your workspace.
        </p>
      </div>
      <EmptyState
        icon={Bell}
        title="You're all caught up"
        description="New notifications will appear here."
      />
    </div>
  );
}