import { AdminMyTasksView } from '@/components/admin/appointments/AdminMyTasksView';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'My tasks' };

export default async function Page() {
  const { profile } = await requirePermission(PERMISSIONS.serviceAppointmentsRead, '/admin/my-tasks');
  if (profile.role !== 'technician') redirect('/admin/appointments');
  await requirePermission(PERMISSIONS.serviceAppointmentsWork, '/admin/my-tasks');
  return <AdminMyTasksView />;
}
