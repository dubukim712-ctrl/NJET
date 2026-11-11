import { StaffServiceAppointments } from '@/components/admin/appointments/StaffServiceAppointments';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

export const metadata = { title: 'Service appointments' };

export default async function StaffAppointmentsPage() {
  const { profile } = await requirePermission(
    PERMISSIONS.serviceAppointmentsRead,
    '/admin/appointments'
  );

  return (
    <StaffServiceAppointments
      userId={profile.id}
      canManage={hasPermission(profile, PERMISSIONS.serviceAppointmentsManage)}
      canWork={hasPermission(profile, PERMISSIONS.serviceAppointmentsWork)}
    />
  );
}
