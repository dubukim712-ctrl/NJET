'use client';

import { AdminDataFallback } from '@/components/admin/AdminDataFallback';
import { BranchManager } from '@/components/admin/commerce/BranchManager';
import { Button } from '@/components/ui/Button';
import {
  AdminBranchesQueryError,
  useAdminBranchesQuery,
} from '@/data/commerce/admin-branches-client';

export function BranchesQuery({
  userId,
  canManage,
  isBranchScopedStaff,
  assignedBranchId,
}: {
  userId: string;
  canManage: boolean;
  isBranchScopedStaff: boolean;
  assignedBranchId: string | null;
}) {
  const query = useAdminBranchesQuery(
    userId,
    canManage,
    isBranchScopedStaff,
    assignedBranchId
  );

  if (!query.data && query.isPending) {
    return <AdminDataFallback label="branch data" />;
  }

  if (!query.data) {
    const message = query.error instanceof AdminBranchesQueryError
      ? query.error.message
      : 'Branch data could not be loaded.';
    return (
      <div className="space-y-3">
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert"
        >
          {message}
        </p>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {query.isError && (
        <div className="space-y-2" role="alert">
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {query.error instanceof AdminBranchesQueryError
              ? query.error.message
              : 'Branch data could not be refreshed.'}
          </p>
          <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
            Try again
          </Button>
        </div>
      )}
      {query.data.noAssignedBranch ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground" role="status">
          No branch is assigned to your account. Contact an administrator to access branch information.
        </p>
      ) : (
        <BranchManager
          branches={query.data.branches}
          canManage={query.data.canManage}
          canCreateBranch={query.data.canCreateBranch}
        />
      )}
    </div>
  );
}
