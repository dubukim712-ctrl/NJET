import { AdminNotificationsView } from '@/components/admin/notifications/AdminNotificationsView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Notifications' };

export default async function Page() {
  await requirePermission(PERMISSIONS.adminAccess, '/admin/notifications');
  return <AdminNotificationsView />;
}
