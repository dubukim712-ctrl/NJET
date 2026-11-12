import { getBranchManagementData } from '@/data/commerce/admin-queries';
import type { createClient } from '@/data/supabase/server';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { UserProfile } from '@/types/database';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type DashboardBranchOption = {
  id: string;
  name: string;
};

export type DashboardBranchContext = {
  branches: DashboardBranchOption[];
  selectedBranchId: string | null;
  selectedBranchName: string | null;
  canSelectBranch: boolean;
  error: string | null;
};

export async function getDashboardBranchContext(
  supabase: SupabaseClient,
  profile: UserProfile,
  requestedBranchId?: string
): Promise<DashboardBranchContext> {
  const isBranchScopedStaff = profile.scope === 'staff' && !profile.is_full_access;
  if (isBranchScopedStaff) {
    return {
      branches: profile.branch_id
        ? [{ id: profile.branch_id, name: profile.branch_name ?? 'Assigned branch' }]
        : [],
      selectedBranchId: profile.branch_id,
      selectedBranchName: profile.branch_name,
      canSelectBranch: false,
      error: profile.branch_id ? null : 'No branch is assigned to your account. Ask an administrator to assign one.',
    };
  }

  if (!hasPermission(profile, PERMISSIONS.branchesRead)) {
    return {
      branches: [],
      selectedBranchId: null,
      selectedBranchName: null,
      canSelectBranch: false,
      error: null,
    };
  }

  const result = await getBranchManagementData(supabase);
  if (!result.data) {
    return {
      branches: [],
      selectedBranchId: null,
      selectedBranchName: null,
      canSelectBranch: false,
      error: result.error ?? 'Branch options could not be loaded.',
    };
  }

  const branches = result.data.map(({ id, name }) => ({ id, name }));
  const selected = requestedBranchId && requestedBranchId !== 'all'
    ? branches.find((branch) => branch.id === requestedBranchId)
    : undefined;
  if (requestedBranchId && requestedBranchId !== 'all' && !selected) {
    return {
      branches,
      selectedBranchId: null,
      selectedBranchName: null,
      canSelectBranch: true,
      error: 'That branch is unavailable. Showing all branches.',
    };
  }

  return {
    branches,
    selectedBranchId: selected?.id ?? null,
    selectedBranchName: selected?.name ?? null,
    canSelectBranch: true,
    error: null,
  };
}
