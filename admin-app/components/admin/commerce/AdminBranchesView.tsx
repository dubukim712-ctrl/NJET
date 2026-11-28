'use client';

import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { BranchesContent } from '@/components/admin/commerce/BranchesContent';

export function AdminBranchesView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !(hasPermission(profile, PERMISSIONS.branchesRead))) return null;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Locations</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Branches</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage customer pickup locations and branch details.</p>
      </header>
      <BranchesContent />
    </div>
  );
}
