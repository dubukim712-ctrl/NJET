import { AdminAppointmentsView } from '@/components/admin/appointments/AdminAppointmentsView';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Service appointments' };

export default async function Page() {
  const { profile } = await requirePermission(PERMISSIONS.serviceAppointmentsRead, '/admin/appointments');
  if (profile.role === 'technician') redirect('/admin/my-tasks');
  return <AdminAppointmentsView />;
}
