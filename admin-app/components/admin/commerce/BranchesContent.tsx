import { BranchesQuery } from '@/components/admin/commerce/BranchesQuery';
import { requirePermission } from '@/data/auth/guards';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function BranchesContent() {
  const { user, profile } = await requirePermission(PERMISSIONS.branchesRead, '/admin/branches');
  const isBranchScopedStaff = profile.scope === 'staff' && !profile.is_full_access;

  return (
    <BranchesQuery
      userId={user.id}
      canManage={hasPermission(profile, PERMISSIONS.branchesManage)}
      isBranchScopedStaff={isBranchScopedStaff}
      assignedBranchId={profile.branch_id}
    />
  );
}
