import { StaffLandingPage } from '@/components/dashboard/StaffLandingPage';
import { getDashboardBranchContext } from '@/data/dashboard/branch-context';
import { getStaffDashboardData } from '@/data/dashboard/queries';
import { requireStaff } from '@/data/auth/guards';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { RealtimeTable } from '@/types/realtime';

export const metadata = { title: 'Admin Panel' };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string | string[] }>;
}) {
  const { profile, supabase } = await requireStaff('/admin');
  const params = await searchParams;
  const requestedBranchId = typeof params.branch === 'string' ? params.branch : undefined;
  const branchContext = await getDashboardBranchContext(supabase, profile, requestedBranchId);
  const data = await getStaffDashboardData(supabase, profile, branchContext.selectedBranchId);
  const realtimeTables: RealtimeTable[] = [
    ...(data.orders ? ['orders' as const] : []),
    ...(data.appointments ? ['service_appointments' as const] : []),
    ...(data.inventory ? ['branch_inventory', 'product_variants', 'products'] as const : []),
    ...(data.teamMembers ? ['users' as const] : []),
    ...(data.teamMembers && hasPermission(profile, PERMISSIONS.rolesRead)
      ? ['roles' as const]
      : []),
    ...(branchContext.canSelectBranch ? ['branches' as const] : []),
  ];
  return (
    <StaffLandingPage
      profile={profile}
      data={data}
      branchContext={branchContext}
      realtimeTables={realtimeTables}
    />
  );
}
