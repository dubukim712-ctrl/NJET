'use client';

import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useSearchParams } from 'next/navigation';
import { serviceAppointmentFiltersSchema } from '@/lib/validations/service-appointments';
import { StaffServiceAppointments } from '@/components/admin/appointments/StaffServiceAppointments';

export function AdminAppointmentsView() {
  const profile = useVerifiedAdminProfile();
  const params = useSearchParams();
  const view = serviceAppointmentFiltersSchema.shape.view.safeParse(params.get('view') ?? undefined).data ?? 'attention';
  const q = params.get('q');
  if (!profile || !(hasPermission(profile, PERMISSIONS.serviceAppointmentsRead) && profile.role !== 'technician')) return null;

  const search = q?.trim().slice(0, 100) ?? '';
  return (
    <StaffServiceAppointments
      key={view + ":" + search} initialSearch={search} initialView={view}
      userId={profile.id}
      canManage={hasPermission(profile, PERMISSIONS.serviceAppointmentsManage)}
      canWork={hasPermission(profile, PERMISSIONS.serviceAppointmentsWork)}
    />
  );
}
