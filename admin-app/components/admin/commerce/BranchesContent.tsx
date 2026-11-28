'use client';

import { useAdminProfile } from '@/components/providers/AdminProvider';
import { BranchesQuery } from '@/components/admin/commerce/BranchesQuery';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export function BranchesContent() {
  const profile = useAdminProfile();
  const isBranchScopedStaff = profile.scope === 'staff' && !profile.is_full_access;

  return (
    <BranchesQuery
      userId={profile.id}
      canManage={hasPermission(profile, PERMISSIONS.branchesManage)}
      isBranchScopedStaff={isBranchScopedStaff}
      assignedBranchId={profile.branch_id}
    />
  );
}
