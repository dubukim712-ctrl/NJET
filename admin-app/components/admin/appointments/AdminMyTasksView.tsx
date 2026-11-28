'use client';

import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { TechnicianMyTasks } from '@/components/admin/appointments/TechnicianMyTasks';

export function AdminMyTasksView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !(hasPermission(profile, PERMISSIONS.serviceAppointmentsRead) && profile.role === 'technician' && hasPermission(profile, PERMISSIONS.serviceAppointmentsWork))) return null;

  return <TechnicianMyTasks userId={profile.id} />;
}
