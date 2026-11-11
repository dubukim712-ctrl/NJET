'use server';

import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { getBranchManagementData } from '@/data/commerce/admin-queries';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { Database } from '@/types/database';

type Branch = Database['public']['Tables']['branches']['Row'];

export type AdminBranchesData = {
  branches: Branch[];
  canManage: boolean;
  canCreateBranch: boolean;
  noAssignedBranch: boolean;
};

export async function getAdminBranchesAction(): Promise<
  ActionResult<AdminBranchesData>
> {
  const { supabase, profile } = await requirePermission(
    PERMISSIONS.branchesRead,
    '/admin/branches'
  );
  const result = await getBranchManagementData(supabase);
  if (!result.data) {
    return {
      success: false,
      error: result.error ?? 'Branch data is unavailable.',
    };
  }

  const isBranchScopedStaff =
    profile.scope === 'staff' && !profile.is_full_access;
  const canManage = hasPermission(profile, PERMISSIONS.branchesManage);

  return {
    success: true,
    data: {
      branches: isBranchScopedStaff
        ? result.data.filter((branch) => branch.id === profile.branch_id)
        : result.data,
      canManage,
      canCreateBranch: canManage && !isBranchScopedStaff,
      noAssignedBranch: isBranchScopedStaff && !profile.branch_id,
    },
  };
}
