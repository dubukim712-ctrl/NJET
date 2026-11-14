import { redirect } from 'next/navigation';
import { TechnicianMyTasks } from '@/components/admin/appointments/TechnicianMyTasks';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'My tasks' };

export default async function MyTasksPage() {
  const { profile } = await requirePermission(
    PERMISSIONS.serviceAppointmentsRead,
    '/admin/my-tasks',
  );
  if (profile.role !== 'technician') redirect('/admin/appointments');
  await requirePermission(PERMISSIONS.serviceAppointmentsWork, '/admin/my-tasks');

  return <TechnicianMyTasks userId={profile.id} />;
}
