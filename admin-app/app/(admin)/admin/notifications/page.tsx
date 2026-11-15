import { AdminNotificationsPage } from '@/components/admin/notifications/AdminNotificationsPage';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const { profile } = await requirePermission(
    PERMISSIONS.adminAccess,
    '/admin/notifications'
  );

  return <AdminNotificationsPage userId={profile.id} />;
}
