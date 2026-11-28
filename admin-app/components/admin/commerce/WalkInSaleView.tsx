'use client';

import { useQuery } from '@tanstack/react-query';
import { getWalkInBranchesAction } from '@/data/actions/walk-in-sales';
import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { WalkInSaleForm } from '@/components/admin/commerce/WalkInSaleForm';
import { WalkInSaleShell } from '@/components/admin/commerce/WalkInSaleShell';
import { Button } from '@/components/ui/Button';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export function WalkInSaleView() {
  const profile = useVerifiedAdminProfile();
  const allowed = Boolean(profile && hasPermission(profile, PERMISSIONS.ordersManage));
  const query = useQuery({
    queryKey: ['commerce', 'walk-in-branches', profile?.id, profile?.branch_id, profile?.is_full_access],
    queryFn: () => getWalkInBranchesAction(profile!.id),
    enabled: allowed,
    retry: false,
  });
  if (!profile || !allowed) return null;
  if (query.isPending) return <WalkInSaleShell />;

  const isBranchScopedStaff = profile.scope === 'staff' && !profile.is_full_access;
  const branchId = isBranchScopedStaff ? query.data?.find(({ id }) => id === profile.branch_id)?.id : undefined;
  return (
    <WalkInSaleShell>
      {query.isError && <div role="alert" className="space-y-2">
        <p>Branch data is unavailable.</p>
        <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>
      </div>}
      {query.data && (query.data.length === 0 || (isBranchScopedStaff && !branchId)) && (
        <p role="status">No active branch is available to your account. Contact an administrator.</p>
      )}
      {query.data?.length && (!isBranchScopedStaff || branchId) ? (
        <WalkInSaleForm branches={query.data} initialBranchId={branchId ?? ''} userId={profile.id} canChooseBranch={!isBranchScopedStaff} />
      ) : null}
    </WalkInSaleShell>
  );
}
