import { HelpCenter } from '@/components/help/HelpCenter';
import { requireStaff } from '@/data/auth/guards';
import { adminHelpTopics } from '@/data/help/admin-help-topics';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Staff Guide' };

export default async function StaffGuidePage() {
  const { profile } = await requireStaff('/admin/help');
  const canWorkOnTasks = profile.role === 'technician'
    && hasPermission(profile, PERMISSIONS.serviceAppointmentsRead)
    && hasPermission(profile, PERMISSIONS.serviceAppointmentsWork);
  const links = [
    { href: '/admin/orders', label: 'Orders', visible: hasPermission(profile, PERMISSIONS.ordersRead) },
    { href: '/admin/orders/new', label: 'Create walk-in sale', visible: hasPermission(profile, PERMISSIONS.ordersManage) },
    { href: '/admin/appointments', label: 'Service appointments', visible: hasPermission(profile, PERMISSIONS.serviceAppointmentsRead) },
    { href: '/admin/my-tasks', label: 'My tasks', visible: canWorkOnTasks },
    { href: '/admin/settings', label: 'Settings', visible: profile.is_full_access },
  ].filter(({ visible }) => visible);

  return (
    <HelpCenter
      title="Staff Guide"
      description="Step-by-step guides for sales staff, technicians, and admins. Available actions depend on your role and branch access."
      searchPlaceholder="Try payment proof or technician tasks"
      topicGroups={adminHelpTopics}
      quickLinks={links}
      showPolicies={false}
    />
  );
}
