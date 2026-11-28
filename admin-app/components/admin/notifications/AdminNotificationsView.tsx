'use client';

import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AdminNotificationsPage } from '@/components/admin/notifications/AdminNotificationsPage';

export function AdminNotificationsView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !(hasPermission(profile, PERMISSIONS.adminAccess))) return null;

  return <AdminNotificationsPage userId={profile.id} />;
}
