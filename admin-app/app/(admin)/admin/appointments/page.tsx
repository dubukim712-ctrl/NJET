import { redirect } from 'next/navigation';
import { StaffServiceAppointments } from '@/components/admin/appointments/StaffServiceAppointments';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

export const metadata = { title: 'Service appointments' };

export default async function StaffAppointmentsPage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { profile } = await requirePermission(
    PERMISSIONS.serviceAppointmentsRead,
    '/admin/appointments'
  );
  if (profile.role === 'technician') redirect('/admin/my-tasks');

  const { q } = await searchParams;
  const search = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 100) ?? '';
  return (
    <StaffServiceAppointments
      initialSearch={search}
      userId={profile.id}
      canManage={hasPermission(profile, PERMISSIONS.serviceAppointmentsManage)}
      canWork={hasPermission(profile, PERMISSIONS.serviceAppointmentsWork)}
    />
  );
}
