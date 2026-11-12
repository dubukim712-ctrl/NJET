import { StaffLandingPage } from '@/components/dashboard/StaffLandingPage';
import { getDashboardBranchContext } from '@/data/dashboard/branch-context';
import { getStaffDashboardData } from '@/data/dashboard/queries';
import { requireStaff } from '@/data/auth/guards';

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
  return <StaffLandingPage profile={profile} data={data} branchContext={branchContext} />;
}
