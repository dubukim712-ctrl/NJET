import { BranchManager } from '@/components/admin/commerce/BranchManager';
import { requirePermission } from '@/data/auth/guards';
import { getBranchManagementData } from '@/data/commerce/admin-queries';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function BranchesContent() {
  const { supabase, profile } = await requirePermission(PERMISSIONS.branchesRead, '/admin/branches');
  const result = await getBranchManagementData(supabase);

  if (result.error || !result.data) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
        {result.error ?? 'Branch data is unavailable.'}
      </p>
    );
  }

  const isBranchScopedStaff = profile.scope === 'staff' && !profile.is_full_access;
  const branches = isBranchScopedStaff
    ? result.data.filter((branch) => branch.id === profile.branch_id)
    : result.data;

  if (isBranchScopedStaff && !profile.branch_id) {
    return (
      <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground" role="status">
        No branch is assigned to your account. Contact an administrator to access branch information.
      </p>
    );
  }

  return (
    <BranchManager
      branches={branches}
      canManage={hasPermission(profile, PERMISSIONS.branchesManage)}
      canCreateBranch={
        hasPermission(profile, PERMISSIONS.branchesManage) && !isBranchScopedStaff
      }
    />
  );
}
